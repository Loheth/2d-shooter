/**
 * Script responsible for rendering the Player and
 * for handling interactions with the user.
 *
 * Author: Tomas Mudrunka
 */

define(function() {
	// Frame dimensions - calculated from sprite sheet (557x448 pixels, 5 columns x 4 rows)
	var FRAME_WIDTH = 111;
	var FRAME_HEIGHT = 112;
	
	// animation frames in the player sprite (4 rows x 5 columns)
	// Row 1: Up direction (y: 0)
	// Row 2: Right direction (y: FRAME_HEIGHT)
	// Row 3: Down direction (y: FRAME_HEIGHT * 2)
	// Row 4: Left direction (y: FRAME_HEIGHT * 3)
	var playerAnimation = {
		walkUp: [
			{ x:   0, y:   0, width: FRAME_WIDTH, height: FRAME_HEIGHT },
			{ x: FRAME_WIDTH, y:   0, width: FRAME_WIDTH, height: FRAME_HEIGHT },
			{ x: FRAME_WIDTH * 2, y:   0, width: FRAME_WIDTH, height: FRAME_HEIGHT },
			{ x: FRAME_WIDTH * 3, y:   0, width: FRAME_WIDTH, height: FRAME_HEIGHT },
			{ x: FRAME_WIDTH * 4, y:   0, width: FRAME_WIDTH, height: FRAME_HEIGHT }
		],
		walkRight: [
			{ x:   0, y: FRAME_HEIGHT, width: FRAME_WIDTH, height: FRAME_HEIGHT },
			{ x: FRAME_WIDTH, y: FRAME_HEIGHT, width: FRAME_WIDTH, height: FRAME_HEIGHT },
			{ x: FRAME_WIDTH * 2, y: FRAME_HEIGHT, width: FRAME_WIDTH, height: FRAME_HEIGHT },
			{ x: FRAME_WIDTH * 3, y: FRAME_HEIGHT, width: FRAME_WIDTH, height: FRAME_HEIGHT },
			{ x: FRAME_WIDTH * 4, y: FRAME_HEIGHT, width: FRAME_WIDTH, height: FRAME_HEIGHT }
		],
		walkDown: [
			{ x:   0, y: FRAME_HEIGHT * 2, width: FRAME_WIDTH, height: FRAME_HEIGHT },
			{ x: FRAME_WIDTH, y: FRAME_HEIGHT * 2, width: FRAME_WIDTH, height: FRAME_HEIGHT },
			{ x: FRAME_WIDTH * 2, y: FRAME_HEIGHT * 2, width: FRAME_WIDTH, height: FRAME_HEIGHT },
			{ x: FRAME_WIDTH * 3, y: FRAME_HEIGHT * 2, width: FRAME_WIDTH, height: FRAME_HEIGHT },
			{ x: FRAME_WIDTH * 4, y: FRAME_HEIGHT * 2, width: FRAME_WIDTH, height: FRAME_HEIGHT }
		],
		walkLeft: [
			{ x:   0, y: FRAME_HEIGHT * 3, width: FRAME_WIDTH, height: FRAME_HEIGHT },
			{ x: FRAME_WIDTH, y: FRAME_HEIGHT * 3, width: FRAME_WIDTH, height: FRAME_HEIGHT },
			{ x: FRAME_WIDTH * 2, y: FRAME_HEIGHT * 3, width: FRAME_WIDTH, height: FRAME_HEIGHT },
			{ x: FRAME_WIDTH * 3, y: FRAME_HEIGHT * 3, width: FRAME_WIDTH, height: FRAME_HEIGHT },
			{ x: FRAME_WIDTH * 4, y: FRAME_HEIGHT * 3, width: FRAME_WIDTH, height: FRAME_HEIGHT }
		],
		// Stand animations use first frame of each direction
		standUp: [
			{ x:   0, y:   0, width: FRAME_WIDTH, height: FRAME_HEIGHT }
		],
		standRight: [
			{ x:   0, y: FRAME_HEIGHT, width: FRAME_WIDTH, height: FRAME_HEIGHT }
		],
		standDown: [
			{ x:   0, y: FRAME_HEIGHT * 2, width: FRAME_WIDTH, height: FRAME_HEIGHT }
		],
		standLeft: [
			{ x:   0, y: FRAME_HEIGHT * 3, width: FRAME_WIDTH, height: FRAME_HEIGHT }
		],
		// Legacy support - default to down direction
		walk: [
			{ x:   0, y: FRAME_HEIGHT * 2, width: FRAME_WIDTH, height: FRAME_HEIGHT },
			{ x: FRAME_WIDTH, y: FRAME_HEIGHT * 2, width: FRAME_WIDTH, height: FRAME_HEIGHT },
			{ x: FRAME_WIDTH * 2, y: FRAME_HEIGHT * 2, width: FRAME_WIDTH, height: FRAME_HEIGHT },
			{ x: FRAME_WIDTH * 3, y: FRAME_HEIGHT * 2, width: FRAME_WIDTH, height: FRAME_HEIGHT },
			{ x: FRAME_WIDTH * 4, y: FRAME_HEIGHT * 2, width: FRAME_WIDTH, height: FRAME_HEIGHT }
		],
		stand: [
			{ x:   0, y: FRAME_HEIGHT * 2, width: FRAME_WIDTH, height: FRAME_HEIGHT }
		]
	};

	/** The Player object. */
	function Player() {
		var img = new Image();
		var self = this;
		
		// Track current movement direction for animation selection
		this.currentDirection = 'down';
		this.foreground = null;
		
		// Set up image loading handlers
		img.onload = function() {
			// Image loaded, ensure sprite is properly initialized
			if (self.sprite) {
				// Force sprite to refresh with loaded image
				self.sprite.setImage(img);
				self.sprite.setAnimation('standDown');
				self.sprite.setIndex(0);
				// Redraw if layer exists
				if (self.foreground && self.foreground.getLayer()) {
					self.foreground.getLayer().draw();
				}
			}
		};
		img.onerror = function() {
			console.error('Failed to load player sprite: img/game/player-sprite.png');
		};
		
		// Set image source (may already be cached)
		img.src = 'img/game/player-sprite.png';
		
		// Check if image is already loaded (cached)
		if (img.complete && img.naturalWidth > 0) {
			// Image already loaded, trigger onload manually
			setTimeout(function() {
				img.onload();
			}, 0);
		}

		this.sprite = new Kinetic.Sprite({
			x: -50,
			y: -50,
			offset: [FRAME_WIDTH/2, FRAME_HEIGHT/2],
			image: img,
			animation: 'standDown',
			animations: playerAnimation,
			frameRate: 12,
			index: 0
		});
		this.blood = new Kinetic.Circle({
			x: -50,
			y: -50,
			offset: [-10,15],
			radius: 15,
			fill: '#da4f49',
			opacity: 0.0
		});

		this.damageTween = null;
		this.deathTween = null;

		this.deathSound = null;

		this.speed = 4;
		this.moveAnim = null;

		this.shootCallback = null;

		this.paused = false;
		this.disabled = true;
	}

	/**
	 * The Player initialization.
	 * @param playerLayer KineticJS Layer
	 * @param playerGroup KineticJS Group
	 * @param foreground object used for binding mouse-events
	 * @param playground object used for binding key-events
	 */
	Player.prototype.init = function(playerLayer, playerGroup, foreground, playground) {
		var self = this;
		var player = this.sprite;
		var blood = this.blood;
		var width = function() { return foreground.getWidth(); };
		var height = function() { return foreground.getHeight(); };

		this.foreground = foreground;

		// add player to the layer
		playerGroup.add(player);
		playerGroup.add(blood);

		// load player-scream sound
		this.deathSound = new Audio();
		this.deathSound.src = 'audio/player-death-scream.mp3';
		this.deathSound.load();

		// bind mouse-move to rotate the player
		foreground.on('mousemove', function(event) {
			if (!self.paused && !self.disabled) {
				var x = event.layerX || event.x || event.clientX;
				var y = event.layerY || event.y || event.clientY;
				var angle = Math.atan((y - player.getY()) / (x - player.getX()));
				player.setRotation(angle);
				blood.setRotation(angle);
				if (x >= player.getX()) {
					player.rotateDeg(-90);
					blood.rotateDeg(-90);
				} else {
					player.rotateDeg(90);
					blood.rotateDeg(90);
				}
			}
		});

		// bind mouse-click to shooting
		foreground.on('click', function(event) {
			if (!self.paused && !self.disabled) {
				var x = event.layerX || event.x || event.clientX;
				var y = event.layerY || event.y || event.clientY;
				if (self.shootCallback) {
					var playerX = player.getX();
					var playerY = player.getY();
					
					// Calculate direction from player to mouse cursor
					var dx = x - playerX;
					var dy = y - playerY;
					var distance = Math.sqrt(dx * dx + dy * dy);
					
					// Calculate gun tip position - gun extends from center to edge in shooting direction
					// The gun tip is approximately at the edge of the sprite frame
					var gunX = playerX;
					var gunY = playerY;
					
					if (distance > 0) {
						// Normalize direction vector
						var dirX = dx / distance;
						var dirY = dy / distance;
						
						// Gun tip offset - extends to the very edge of sprite frame
						// The gun tip is at the edge of the sprite, so we use slightly more than half
						// to ensure bullets spawn exactly at the gun tip
						var gunOffsetX = dirX * (FRAME_WIDTH * 0.52);
						var gunOffsetY = dirY * (FRAME_HEIGHT * 0.52);
						
						gunX = playerX + gunOffsetX;
						gunY = playerY + gunOffsetY;
					} else {
						// If mouse is exactly on player, default to down direction
						gunY = playerY + FRAME_HEIGHT * 0.52;
					}
					
					var points = [ gunX, gunY, x, y ];
					self.shootCallback(points);
				}
			}
		});

		// bind key-press to move the player
		var moving = [];
		var isMoving = function() { return moving['up'] || moving['down'] || moving['left'] || moving['right']; };
		var getCurrentDirection = function() {
			// Priority: up > down > left > right (for diagonal movement)
			if (moving['up']) return 'up';
			if (moving['down']) return 'down';
			if (moving['left']) return 'left';
			if (moving['right']) return 'right';
			return self.currentDirection; // Keep last direction when standing
		};
		var updateAnimation = function() {
			if (isMoving()) {
				var dir = getCurrentDirection();
				self.currentDirection = dir;
				player.setAnimation('walk' + dir.charAt(0).toUpperCase() + dir.slice(1));
			} else {
				player.setAnimation('stand' + self.currentDirection.charAt(0).toUpperCase() + self.currentDirection.slice(1));
			}
		};
		playground.on('keydown', function(event) {
			if (!self.paused && !self.disabled) {
				// handle key-down events
				var wasMoving = isMoving();
				switch (event.which) {
					case 87: // W
						moving['up'] = true;
						break;
					case 83: // S
						moving['down'] = true;
						break;
					case 65: // A
						moving['left'] = true;
						break;
					case 68: // D
						moving['right'] = true;
						break;
				}
				if (!wasMoving && isMoving()) {
					updateAnimation();
				} else if (isMoving()) {
					updateAnimation();
				}
			}
		});
		playground.on('keyup', function(event) {
			if (!self.paused && !self.disabled) {
				// handle key-up events
				var wasMoving = isMoving();
				switch (event.which) {
					case 87: // W
						delete moving['up'];
						break;
					case 83: // S
						delete moving['down'];
						break;
					case 65: // A
						delete moving['left'];
						break;
					case 68: // D
						delete moving['right'];
						break;
				}
				if (wasMoving && !isMoving()) {
					updateAnimation();
				} else if (isMoving()) {
					updateAnimation();
				}
			}
		});
		this.moveAnim = new Kinetic.Animation(function() {
			// moving the Player
			var dx, dy, move = self.speed;
			if (moving['up'] && 0 < player.getY()) {
				dy = Math.max(-move, -player.getY());
				player.move(0, dy);
				blood.move(0, dy);
			}
			if (moving['down'] && player.getY() < height()) {
				dy = Math.min(move, height() - player.getY());
				player.move(0, dy);
				blood.move(0, dy);
			}
			if (moving['left'] && 0 < player.getX()) {
				dx = Math.max(-move, -player.getX());
				player.move(dx, 0);
				blood.move(dx, 0);
			}
			if (moving['right'] && player.getX() < width()) {
				dx = Math.min(move, width() - player.getX());
				player.move(dx, 0);
				blood.move(dx, 0);
			}
		}, playerLayer);
	};

	/**
	 * Set-up the Player for the beginning of the game.
	 */
	Player.prototype.gameBegin = function() {
		var width = this.foreground.getWidth();
		var height = this.foreground.getHeight();

		this.paused = false;
		this.disabled = false;
		this.currentDirection = 'down'; // Reset direction
		this.sprite.setAnimation('standDown');
		this.sprite.start();
		this.sprite.show();

		this.blood.setRadius(15);
		this.blood.setOpacity(0.0);

		// move player to the center
		this.sprite.setX(width/2);
		this.sprite.setY(height/2);
		this.blood.setX(width/2);
		this.blood.setY(height/2);

		if (this.moveAnim != null) {
			this.moveAnim.start();
		}
		if (this.damageTween != null) {
			this.damageTween.destroy();
		}
		if (this.deathTween != null) {
			this.deathTween.destroy();
			this.deathTween = null;
		}

		// create damage animation tween
		this.damageTween = new Kinetic.Tween({
			node: this.blood,
			opacity: 0.6,
			duration: 0.5,
			easing: Kinetic.Easings.StrongEaseOut,
			onFinish: function() {
				this.reverse();
			}
		});
	};

	/**
	 * Starts Players' 'death' animation for the game-over.
	 */
	Player.prototype.gameOver = function() {
		this.disabled = true;
		this.sprite.stop();
		this.sprite.hide();

		if (this.moveAnim != null) {
			this.moveAnim.stop();
		}
		if (this.damageTween != null) {
			this.damageTween.destroy();
			this.damageTween = null;
		}
		if (this.deathTween != null) {
			this.deathTween.destroy();
		}

		// create death animation tween
		this.deathTween = new Kinetic.Tween({
			node: this.blood,
			opacity: 0.8,
			radius: 30,
			duration: 2,
			easing: Kinetic.Easings.EaseOut
		});
		this.deathTween.play();
		this.deathSound.play();
	};

	/**
	 * Starts the Players' animation.
	 */
	Player.prototype.start = function() {
		this.paused = false;
		this.sprite.start();
		if (this.moveAnim != null) {
			this.moveAnim.start();
		}
	};

	/**
	 * Stops the Players' animation.
	 */
	Player.prototype.stop = function() {
		this.paused = true;
		this.sprite.stop();
		if (this.moveAnim != null) {
			this.moveAnim.stop();
		}
	};

	/**
	 * Sets moving speed of the Player.
	 * @param speed number
	 */
	Player.prototype.setSpeed = function(speed) {
		this.speed = speed;
		this.sprite.stop();
		this.sprite.setFrameRate(speed * 3);
		this.sprite.start();
	};

	/**
	 * Returns position of the Player.
	 * @returns {{x: *, y: *}} X Y coordinates
	 */
	Player.prototype.getPosition = function() {
		return { x: this.sprite.getX(), y: this.sprite.getY() };
	};

	/**
	 * Starts 'damage' animation.
	 */
	Player.prototype.showDamage = function() {
		if (this.damageTween != null) {
			this.damageTween.play();
		}
	};

	/**
	 * Destroys and removes the Player instance.
	 */
	Player.prototype.destroy = function() {
		this.disabled = true;
		if (this.moveAnim != null) {
			this.moveAnim.stop();
		}
		if (this.damageTween != null) {
			this.damageTween.destroy();
		}
		if (this.deathTween != null) {
			this.deathTween.destroy();
		}
		this.sprite.destroy();
		this.blood.destroy();
	};

	return Player;
});
