/**
 * Script responsible for basic game mechanics.
 *
 * Author: Tomas Mudrunka
 */

define(["player","shoot","enemyGenerator"], function(Player, Shoot, EnemyGenerator) {
	// background image pattern
	var bgImg = new Image();
	bgImg.src = 'img/game/bg-texture.jpg';

	/** The Game object. */
	function Game() {
		this.playground = $('#playground');

		var width = $(window).width();
		var height = $(window).height();

		this.stage = new Kinetic.Stage({
			container: 'playground',
			width: width,
			height: height
		});

		this.background = new Kinetic.Rect({
			x: 0,
			y: 0,
			width: width,
			height: height,
			stroke: 'black',
			strokeWidth: 4,
			fillPatternImage: bgImg
		});
		this.foreground = new Kinetic.Rect({
			x: 0,
			y: 0,
			width: width,
			height: height,
			fill: 'black',
			opacity: 0.5
		});

		this.firstLayer = new Kinetic.Layer();
		this.mainLayer = new Kinetic.Layer();
		this.lastLayer = new Kinetic.Layer();

		this.text = new Kinetic.Text({
			x: 10,
			y: 10,
			fontSize: 30,
			fontStyle: 'bold',
			fill: '#357735',
			shadowColor: 'gray'
		});

		this.user = null;

		this.playerGroup = new Kinetic.Group();
		this.player = new Player();
		this.playerHP = 0;

		this.shootGroup = new Kinetic.Group();
		this.shoot = new Shoot();

		this.enemyGroup = new Kinetic.Group();
		this.enemyGenerator = new EnemyGenerator();

		this.playerSpeed = 4;
		this.difficulty = 1;

		this.gameTime = null;
		this.gamePauseTime = null;
		this.gameOverCallback = null;
		this.gameEnded = false;
	}

	/**
	 * The Game initialization.
	 */
	Game.prototype.init = function() {
		var self = this;
		var player = this.player;
		var shoot = this.shoot;
		var generator = this.enemyGenerator;

		// bind all layers
		this.firstLayer.add(this.background);
		this.mainLayer.add(this.shootGroup);
		this.mainLayer.add(this.enemyGroup);
		this.mainLayer.add(this.playerGroup);
		this.mainLayer.add(this.text);
		this.lastLayer.add(this.foreground);

		var E1 = 0.05; // epsilon for angle comparison
		var E2 = 5.0; // epsilon for position comparison

		// create callback for shooting
		player.shootCallback = function(points) {
			shoot.renderShoot(points);

			var enemies = generator.getEnemies();

			var x = points[2], y = points[3];
			var p = player.getPosition();

			var angle = Math.atan((y - p.y) / (x - p.x));
			if (x >= p.x) {
				angle = -angle;
			}

			// iterate over all enemies
			for (var i = 0; i < enemies.length; i++) {
				var e = enemies[i].getPosition();
				var a = Math.atan((e.y - p.y) / (e.x - p.x));
				if (e.x >= p.x) {
					a = -a;
				}
				if (angle - E1 < a && a < angle + E1) {
					generator.handleEnemyHit(i);
				}
			}
		};
		player.init(this.mainLayer, this.playerGroup, this.foreground, this.playground);

		shoot.init(this.shootGroup, this.foreground);

		// create callbacks for enemy generator
		var attackCallback = function(x, y) {
			// Don't process damage if game has already ended
			if (self.gameEnded) {
				return;
			}
			
			var p = player.getPosition();
			if (x - E2 < p.x && p.x < x + E2 && y - E2 < p.y && p.y < y + E2) {
				// Only process damage if HP is greater than 0
				if (self.playerHP > 0) {
					player.showDamage();
					self.playerHP = Math.max(0, self.playerHP - 1);
					if (self.playerHP <= 0) {
						self.playerHP = 0; // Ensure HP is exactly 0
						self.gameEnded = true; // Set flag immediately to prevent further damage
						self.endGame();
					}
					self.refreshText();
				}
			}
		};
		var goToCallback = function() {
			this.goTo(player.getPosition());
		};
		generator.init(this.mainLayer, this.enemyGroup, this.foreground, attackCallback, goToCallback);

		// add layers to the stage
		this.stage.add(this.firstLayer);
		this.stage.add(this.mainLayer);
		this.stage.add(this.lastLayer);

		bgImg.onload = function() {
			self.firstLayer.draw();
		};
	};

	/**
	 * Begins new game (also re-start).
	 */
	Game.prototype.beginNewGame = function() {
		// clean-up before start
		this.playerHP = 50;
		this.gameEnded = false; // Reset game ended flag
		this.player.setSpeed(this.playerSpeed);
		this.enemyGenerator.clean();
		this.enemyGenerator.setDifficulty(this.difficulty);
		this.refreshText();

		// start new game
		this.player.gameBegin();
		this.enemyGenerator.start();
		this.gameTime = new Date().getTime();
		this.gamePauseTime = null;

		this.foreground.setOpacity(0.0);
		this.lastLayer.draw();
	};

	/**
	 * Ends current game, terminates the Player.
	 */
	Game.prototype.endGame = function() {
		this.gameEnded = true; // Ensure flag is set
		this.player.gameOver();
		// Stop enemies immediately to prevent further damage
		this.enemyGenerator.stop();
		if (this.gameOverCallback) {
			var self = this;
			var result = {
				user: this.user,
				speed: this.player.speed,
				difficulty: this.enemyGenerator.difficulty,
				time: new Date().getTime() - this.gameTime,
				kills: this.enemyGenerator.killCount
			};
			setTimeout(function() {
				self.pause();
				self.gameOverCallback(result);
			}, 3000);
		}
	};

	/**
	 * Will play/resume the game.
	 */
	Game.prototype.play = function() {
		this.player.start();
		this.enemyGenerator.start();

		if (this.gamePauseTime) {
			this.gameTime += new Date().getTime() - this.gamePauseTime;
			this.gamePauseTime = null;
		}

		this.foreground.setOpacity(0.0);
		this.lastLayer.draw();
	};

	/**
	 * Will pause the game.
	 */
	Game.prototype.pause = function() {
		this.player.stop();
		this.enemyGenerator.stop();

		this.gamePauseTime = new Date().getTime();

		this.foreground.setOpacity(0.5);
		this.lastLayer.draw();
	};

	/**
	 * Renders up-to-date text with HP.
	 */
	Game.prototype.refreshText = function() {
		// Ensure HP is never displayed as negative
		var displayHP = Math.max(0, this.playerHP);
		this.text.setText('Player HP: ' + displayHP);
		this.mainLayer.draw();
	};

	/**
	 * Sets current user/player.
	 * @param user User object
	 */
	Game.prototype.setUser = function(user) {
		this.user = user;
	};

	/**
	 * Sets moving speed of the Player.
	 * @param speed number > 0
	 */
	Game.prototype.setPlayerSpeed = function(speed) {
		this.playerSpeed = speed;
	};

	/**
	 * Sets initial difficulty of enemies.
	 * @param difficulty number > 0
	 */
	Game.prototype.setDifficulty = function(difficulty) {
		this.difficulty = difficulty
	};

	/**
	 * Resize the playground.
	 * @param width new width
	 * @param height new height
	 */
	Game.prototype.resizePlayground = function(width, height) {
		this.stage.setWidth(width);
		this.stage.setHeight(height);
		this.background.setWidth(width);
		this.background.setHeight(height);
		this.foreground.setWidth(width);
		this.foreground.setHeight(height);
		this.stage.draw();
	};

	return Game;
});
