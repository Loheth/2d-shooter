/**
 * Main script (entry-point) for the 2D Shooter game.
 *
 * Author: Tomas Mudrunka
 */
require.config({
	baseUrl: "js/game"
});

require(["game","users","htmlBuilder"], function(Game, Users, HTMLBuilder) {
	var builder = new HTMLBuilder();

	var users = new Users();
	users.init();

	$('#users, #users a[href="#all-users"]').on('shown', function() {
		var tab = builder.buildUsersTable(users.getAllUsers());
		var content = $('#all-users').find('div.content');
		content.empty().append(tab);
		content.find('button').on('click', function(event) {
			var target = $(event.target);
			users.login(target.attr('data-id'));
			game.setUser(users.loggedUser());
			content.find('tr.info').removeClass('info');
			target.parents('tr').addClass('info');
		});
		var logged = users.loggedUser();
		if (logged) {
			content.find('tr[data-id="' + logged.id + '"]').addClass('info');
			$('#message-score').text("You are logged as " + logged.name + ".");
		}
	});

	$('#users').find('a[href="#new-user"]').on('shown', function() {
		$('#new-user-name').val('').focus();
		$('#new-user').find('.control-group').removeClass('success').removeClass('error');
	});

	$('#new-user').find('form').on('submit', function(event) {
		event.preventDefault();
		var name = $('#new-user-name').val();
		users.newUser(name);
		var group = $(this).find('.control-group').addClass('success');
		setTimeout(function() {
			group.removeClass('success');
		}, 2000);
	});

	// Hide game interface initially
	$('#playground').hide();
	
	var game = new Game();
	var running = false;
	var pendingGameResult = null; // Store game result until user enters name
	game.init();
	game.setUser(users.loggedUser());
	game.gameOverCallback = function(result) {
		var time =  Math.round(result.time / 100) / 10;
		// Store the result temporarily - don't save yet
		pendingGameResult = {
			time: time,
			kills: result.kills
		};
		running = false;
		// Clear current user so score doesn't get saved to wrong user
		users.currentUser = null;
		$('#message-score').text("GAME OVER: You've killed " + result.kills + " enemies, in " + time + "s.");
		// Show system-compromised modal
		$('#system-compromised').modal('show');
		// Reset modal to name input state
		$('#name-input-section').show();
		$('#leaderboard-section').hide();
		$('#submit-name').show();
		$('#play-again-btn').hide();
		$('#quit-btn').hide();
		$('#player-name-input').val('');
	};

	game.playground.on('keypress', function(event) {
		if (event.which == 0) { // ESC
			// ESC key handler removed - game starts directly
		}
	});

	if (users.loggedUser()) {
		$('#message-score').text("You are logged as " + users.loggedUser().name + ".");
	} else {
		$('#message-score').text("You must log-in to track your high-scores.");
	}

	var W = $(window);
	var getWidth = function() { return W.width(); };
	var getHeight = function() { return W.height(); };
	W.resize(function() {
		game.resizePlayground(getWidth(), getHeight());
	});
	$('#game-menu, #settings, #users, #about, #system-compromised').on('hidden', function() {
		if ($('#playground').is(':visible')) {
			game.playground.focus();
		}
	});

	$('#game-begin').on('click', function() {
		game.beginNewGame();
		running = true;
		$('#message-score').text('');
	});
	$('#game-end').on('click', function() {
		if (running) {
			game.endGame();
		}
	});
	$('#game-play').on('click', function() {
		if (running) {
			game.play();
		}
	});
	$('#game-pause').on('click', function() {
		if (running) {
			game.pause();
		}
	});

	$('#settings-save').on('click', function() {
		var playerSpeed = $('#player-speed').val();
		game.setPlayerSpeed(playerSpeed);
		var difficulty = $('#difficulty').val();
		game.setDifficulty(difficulty);
	});

	// Start button handler
	$('#start-button').on('click', function() {
		$('#start-screen').addClass('hidden');
		$('#playground').show();
		game.playground.focus();
		game.beginNewGame();
		running = true;
	});

	// Handle submit name button - show leaderboard and action buttons
	$('#submit-name').on('click', function() {
		var playerName = $('#player-name-input').val().trim();
		if (playerName) {
			// Find existing user or create new one
			var existingUser = null;
			var allUsers = users.getAllUsers();
			for (var i = 0; i < allUsers.length; i++) {
				if (allUsers[i].name === playerName) {
					existingUser = allUsers[i];
					break;
				}
			}
			var userToLogin = existingUser;
			if (!existingUser) {
				userToLogin = users.newUser(playerName);
			}
			users.login(userToLogin.id);
			game.setUser(users.loggedUser());
			
			// NOW save the score to the correct user
			if (pendingGameResult) {
				users.updateScore(pendingGameResult.time, pendingGameResult.kills);
				pendingGameResult = null; // Clear it after saving
			}
			
			// Show leaderboard
			var leaderboard = builder.buildLeaderboardTable(users.getTop5Leaderboard());
			$('#leaderboard-content').empty().append(leaderboard);
			$('#name-input-section').hide();
			$('#leaderboard-section').show();
			$('#submit-name').hide();
			$('#play-again-btn').show();
			$('#quit-btn').show();
		}
	});

	// Play Again button handler - restart the game
	$('#play-again-btn').on('click', function() {
		$('#system-compromised').modal('hide');
		// Reset modal state for next time
		$('#name-input-section').show();
		$('#leaderboard-section').hide();
		$('#submit-name').show();
		$('#play-again-btn').hide();
		$('#quit-btn').hide();
		$('#player-name-input').val('');
		// Clear any pending game result
		pendingGameResult = null;
		// Restart the game
		game.beginNewGame();
		running = true;
		game.playground.focus();
	});

	// Quit button handler - go back to start screen
	$('#quit-btn').on('click', function() {
		$('#system-compromised').modal('hide');
		// Reset modal state for next time
		$('#name-input-section').show();
		$('#leaderboard-section').hide();
		$('#submit-name').show();
		$('#play-again-btn').hide();
		$('#quit-btn').hide();
		$('#player-name-input').val('');
		// Clear any pending game result
		pendingGameResult = null;
		// Clear current user
		users.currentUser = null;
		// Hide playground and show start screen
		$('#playground').hide();
		$('#start-screen').removeClass('hidden');
		running = false;
	});
});
