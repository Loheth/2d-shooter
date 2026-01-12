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
	var currentGameResult = null;
	game.init();
	game.setUser(users.loggedUser());
	game.gameOverCallback = function(result) {
		var time = Math.round(result.time / 100) / 10;
		currentGameResult = {
			time: time,
			kills: result.kills
		};
		running = false;
		
		// Show game over popup with stats (cyber security themed)
		var statsText = "> THREATS_NEUTRALIZED: " + result.kills + "\n> SURVIVAL_TIME: " + time + "s\n> SYSTEM_STATUS: COMPROMISED";
		$('#game-over-stats').html(statsText.replace(/\n/g, '<br>'));
		$('#player-name-input').val('');
		
		// Show leaderboard in game over popup
		var allUsers = users.getAllUsers();
		var leaderboardHTML = builder.buildLeaderboardTable(allUsers);
		$('#game-over-leaderboard').empty().append(leaderboardHTML);
		
		// Reset button visibility
		$('#submit-name-btn').show();
		$('#begin-new-game-btn').hide();
		
		$('#game-over-popup').modal('show');
		// Add class to body for backdrop styling
		$('body').addClass('game-over-open');
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
	$('#game-menu, #settings, #users, #about').on('hidden', function() {
		game.playground.focus();
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

	// Game over popup - submit name handler
	$('#submit-name-btn').on('click', function() {
		var playerName = $('#player-name-input').val().trim();
		if (playerName === '') {
			playerName = 'Player';
		}
		
		// Create or get user
		var loggedUser = users.loggedUser();
		if (!loggedUser || loggedUser.name !== playerName) {
			// Create new user or login as existing
			var allUsers = users.getAllUsers();
			var existingUser = null;
			for (var i = 0; i < allUsers.length; i++) {
				if (allUsers[i].name === playerName) {
					existingUser = allUsers[i];
					break;
				}
			}
			
			if (existingUser) {
				users.login(existingUser.id);
			} else {
				var newUser = users.newUser(playerName);
				users.login(newUser.id);
			}
			game.setUser(users.loggedUser());
		}
		
		// Update score
		if (currentGameResult) {
			users.updateScore(currentGameResult.time, currentGameResult.kills);
		}
		
		// Update leaderboard with new score
		var allUsers = users.getAllUsers();
		var leaderboardHTML = builder.buildLeaderboardTable(allUsers);
		$('#game-over-leaderboard').empty().append(leaderboardHTML);
		
		// Hide submit button and show begin new game button
		$('#submit-name-btn').hide();
		$('#begin-new-game-btn').show();
		$('#player-name-input').prop('disabled', true);
	});

	// Allow Enter key to submit name
	$('#player-name-input').on('keypress', function(e) {
		if (e.which === 13) { // Enter key
			$('#submit-name-btn').click();
		}
	});

	// Begin new game button handler
	$('#begin-new-game-btn').on('click', function() {
		$('#game-over-popup').modal('hide');
		$('#playground').show();
		game.playground.focus();
		game.beginNewGame();
		running = true;
		$('#message-score').text('');
		// Reset input
		$('#player-name-input').prop('disabled', false);
		$('#submit-name-btn').show();
		$('#begin-new-game-btn').hide();
	});

	// Quit game button handler
	$('#quit-game-btn').on('click', function() {
		$('#game-over-popup').modal('hide');
		$('#playground').hide();
		$('#start-screen').removeClass('hidden');
		// Reset input
		$('#player-name-input').prop('disabled', false);
		$('#submit-name-btn').show();
		$('#begin-new-game-btn').hide();
	});

	// Close leaderboard handler
	$('#close-leaderboard-btn').on('click', function() {
		$('#leaderboard-modal').modal('hide');
	});

	// Function to show leaderboard
	function showLeaderboard() {
		var allUsers = users.getAllUsers();
		var leaderboardHTML = builder.buildLeaderboardTable(allUsers);
		$('#leaderboard-content').empty().append(leaderboardHTML);
		$('#leaderboard-modal').modal('show');
	}

	// Handle modal close events
	$('#game-over-popup, #leaderboard-modal').on('hidden', function() {
		// Remove game-over class from body
		$('body').removeClass('game-over-open');
		// Focus back to playground when modals close
		game.playground.focus();
	});
});
