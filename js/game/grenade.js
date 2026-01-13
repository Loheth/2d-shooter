/**
 * Script responsible for rendering grenades, pickups, and explosions.
 *
 * Author: AI Assistant
 */

define(function() {
	/** The Grenade object. */
	function Grenade() {
		this.grenadeGroup = null;
		this.pickupGroup = null;
		this.explosionGroup = null;
		this.foreground = null;
		
		this.activeGrenades = [];
		this.activePickups = [];
		this.activeExplosions = [];
		
		this.playerGrenadeCount = 0;
		this.maxGrenades = 5;
	}

	/**
	 * The Grenade initialization.
	 * @param grenadeGroup KineticJS Group for thrown grenades
	 * @param pickupGroup KineticJS Group for pickup items
	 * @param explosionGroup KineticJS Group for explosions
	 * @param foreground object used to get dimensions
	 */
	Grenade.prototype.init = function(grenadeGroup, pickupGroup, explosionGroup, foreground) {
		this.grenadeGroup = grenadeGroup;
		this.pickupGroup = pickupGroup;
		this.explosionGroup = explosionGroup;
		this.foreground = foreground;
	};

	/**
	 * Creates a grenade pickup at random position.
	 */
	Grenade.prototype.createPickup = function() {
		var self = this;
		
		// Random position on screen
		var x = Math.random() * this.foreground.getWidth();
		var y = Math.random() * this.foreground.getHeight();
		
		// Create visual representation of grenade pickup
		var pickup = new Kinetic.Group({
			x: x,
			y: y
		});
		
		// Outer circle (glow effect)
		var outerCircle = new Kinetic.Circle({
			radius: 12,
			fill: '#00ff00',
			opacity: 0.6,
			shadowColor: '#00ff00',
			shadowBlur: 10,
			shadowOpacity: 0.8
		});
		
		// Inner circle (grenade body)
		var innerCircle = new Kinetic.Circle({
			radius: 8,
			fill: '#228B22',
			stroke: '#00ff00',
			strokeWidth: 2
		});
		
		// Pin (top part)
		var pin = new Kinetic.Rect({
			x: -2,
			y: -10,
			width: 4,
			height: 6,
			fill: '#FFD700',
			stroke: '#FFA500',
			strokeWidth: 1
		});
		
		pickup.add(outerCircle);
		pickup.add(innerCircle);
		pickup.add(pin);
		
		this.pickupGroup.add(pickup);
		
		// Add pulsing animation
		var pulseTween = new Kinetic.Tween({
			node: outerCircle,
			radius: 15,
			opacity: 0.3,
			duration: 1,
			easing: Kinetic.Easings.EaseInOut,
			onFinish: function() {
				this.reverse();
			}
		});
		pulseTween.play();
		
		var pickupData = {
			group: pickup,
			x: x,
			y: y,
			radius: 12,
			pulseTween: pulseTween
		};
		
		this.activePickups.push(pickupData);
		
		// Auto-remove after 30 seconds if not collected
		setTimeout(function() {
			self.removePickup(pickupData);
		}, 30000);
	};

	/**
	 * Removes a pickup from the game.
	 */
	Grenade.prototype.removePickup = function(pickupData) {
		var index = this.activePickups.indexOf(pickupData);
		if (index > -1) {
			if (pickupData.pulseTween) {
				pickupData.pulseTween.destroy();
			}
			pickupData.group.destroy();
			this.activePickups.splice(index, 1);
		}
	};

	/**
	 * Checks if player collected a pickup.
	 * @param playerX Player X position
	 * @param playerY Player Y position
	 * @param playerRadius Player collision radius
	 * @returns {boolean} True if collected
	 */
	Grenade.prototype.checkPickupCollection = function(playerX, playerY, playerRadius) {
		var collected = false;
		for (var i = this.activePickups.length - 1; i >= 0; i--) {
			var pickup = this.activePickups[i];
			var dx = pickup.x - playerX;
			var dy = pickup.y - playerY;
			var distance = Math.sqrt(dx * dx + dy * dy);
			
			if (distance < pickup.radius + playerRadius) {
				// Collected!
				if (this.playerGrenadeCount < this.maxGrenades) {
					this.playerGrenadeCount++;
					collected = true;
				}
				this.removePickup(pickup);
			}
		}
		return collected;
	};

	/**
	 * Throws a grenade from player position towards target.
	 * @param playerX Player X position
	 * @param playerY Player Y position
	 * @param targetX Target X position (mouse)
	 * @param targetY Target Y position (mouse)
	 * @returns {boolean} True if grenade was thrown
	 */
	Grenade.prototype.throwGrenade = function(playerX, playerY, targetX, targetY) {
		if (this.playerGrenadeCount <= 0) {
			return false; // No grenades available
		}
		
		this.playerGrenadeCount--;
		
		var self = this;
		
		// Create grenade visual
		var grenade = new Kinetic.Group({
			x: playerX,
			y: playerY
		});
		
		// Grenade body
		var body = new Kinetic.Circle({
			radius: 6,
			fill: '#228B22',
			stroke: '#00ff00',
			strokeWidth: 1
		});
		
		// Pin
		var pin = new Kinetic.Rect({
			x: -1.5,
			y: -8,
			width: 3,
			height: 5,
			fill: '#FFD700'
		});
		
		grenade.add(body);
		grenade.add(pin);
		this.grenadeGroup.add(grenade);
		
		// Calculate trajectory
		var dx = targetX - playerX;
		var dy = targetY - playerY;
		var distance = Math.sqrt(dx * dx + dy * dy);
		var maxDistance = Math.min(distance, 400); // Max throw distance
		
		// Normalize direction
		var dirX = dx / distance;
		var dirY = dy / distance;
		
		// Throw speed
		var throwSpeed = 8;
		var totalTime = maxDistance / throwSpeed;
		
		// Gravity effect
		var gravity = 0.3;
		var startY = playerY;
		
		var grenadeData = {
			group: grenade,
			x: playerX,
			y: playerY,
			vx: dirX * throwSpeed,
			vy: dirY * throwSpeed,
			gravity: gravity,
			time: 0,
			maxTime: totalTime,
			exploded: false
		};
		
		this.activeGrenades.push(grenadeData);
		
		// Animate grenade flight
		var anim = new Kinetic.Animation(function() {
			if (grenadeData.exploded) {
				return;
			}
			
			grenadeData.time += 0.1;
			
			// Update position
			grenadeData.x += grenadeData.vx;
			grenadeData.y += grenadeData.vy;
			grenadeData.vy += grenadeData.gravity; // Apply gravity
			
			// Rotate grenade
			grenade.rotate(5);
			
			grenade.setX(grenadeData.x);
			grenade.setY(grenadeData.y);
			
			// Check for enemy collision first
			if (grenadeData.enemyGenerator) {
				var enemies = grenadeData.enemyGenerator.getEnemies();
				var grenadeRadius = 6; // Grenade collision radius
				
				for (var i = 0; i < enemies.length; i++) {
					var enemy = enemies[i];
					var enemyPos = enemy.getPosition();
					var dx = enemyPos.x - grenadeData.x;
					var dy = enemyPos.y - grenadeData.y;
					var distance = Math.sqrt(dx * dx + dy * dy);
					
					// Enemy collision radius (approximately 45 pixels based on sprite size)
					var enemyRadius = 45;
					
					if (distance < grenadeRadius + enemyRadius) {
						// Hit an enemy! Explode immediately
						self.explodeGrenade(grenadeData, grenadeData.enemyGenerator);
						anim.stop();
						return;
					}
				}
			}
			
			// Check if hit ground or max time
			if (grenadeData.time >= grenadeData.maxTime || 
			    grenadeData.y >= self.foreground.getHeight() - 10 ||
			    grenadeData.x < 0 || grenadeData.x > self.foreground.getWidth() ||
			    grenadeData.y < 0) {
				self.explodeGrenade(grenadeData, grenadeData.enemyGenerator);
				anim.stop();
			}
		}, this.grenadeGroup.getLayer());
		
		anim.start();
		
		// Store animation reference
		grenadeData.animation = anim;
		
		return true;
	};

	/**
	 * Creates explosion effect and damages enemies.
	 * @param grenadeData Grenade data object
	 * @param enemyGenerator Enemy generator to damage enemies
	 */
	Grenade.prototype.explodeGrenade = function(grenadeData, enemyGenerator) {
		if (grenadeData.exploded) {
			return;
		}
		
		grenadeData.exploded = true;
		var self = this;
		
		// Remove grenade visual
		grenadeData.group.destroy();
		if (grenadeData.animation) {
			grenadeData.animation.stop();
		}
		
		// Create explosion visual
		var explosion = new Kinetic.Group({
			x: grenadeData.x,
			y: grenadeData.y
		});
		
		// Explosion radius
		var explosionRadius = 80;
		
		// Outer explosion circle
		var outerExplosion = new Kinetic.Circle({
			radius: explosionRadius,
			fill: '#ff6600',
			opacity: 0.6,
			shadowColor: '#ff0000',
			shadowBlur: 20,
			shadowOpacity: 1
		});
		
		// Inner explosion circle
		var innerExplosion = new Kinetic.Circle({
			radius: explosionRadius * 0.6,
			fill: '#ffff00',
			opacity: 0.8
		});
		
		// Core explosion
		var coreExplosion = new Kinetic.Circle({
			radius: explosionRadius * 0.3,
			fill: '#ffffff',
			opacity: 1
		});
		
		explosion.add(outerExplosion);
		explosion.add(innerExplosion);
		explosion.add(coreExplosion);
		this.explosionGroup.add(explosion);
		
		// Explosion animation
		var explosionTween = new Kinetic.Tween({
			node: outerExplosion,
			radius: explosionRadius * 1.5,
			opacity: 0,
			duration: 0.5,
			easing: Kinetic.Easings.EaseOut,
			onFinish: function() {
				explosion.destroy();
			}
		});
		
		var innerTween = new Kinetic.Tween({
			node: innerExplosion,
			radius: explosionRadius * 1.2,
			opacity: 0,
			duration: 0.4,
			easing: Kinetic.Easings.EaseOut
		});
		
		var coreTween = new Kinetic.Tween({
			node: coreExplosion,
			radius: explosionRadius * 0.8,
			opacity: 0,
			duration: 0.3,
			easing: Kinetic.Easings.EaseOut
		});
		
		explosionTween.play();
		innerTween.play();
		coreTween.play();
		
		// Kill enemies in radius (the one touched + up to 3 nearby)
		if (enemyGenerator) {
			var enemies = enemyGenerator.getEnemies();
			var enemiesInRadius = [];
			
			// Collect all enemies within explosion radius with their distances
			for (var i = 0; i < enemies.length; i++) {
				var enemy = enemies[i];
				var enemyPos = enemy.getPosition();
				var dx = enemyPos.x - grenadeData.x;
				var dy = enemyPos.y - grenadeData.y;
				var distance = Math.sqrt(dx * dx + dy * dy);
				
				if (distance <= explosionRadius) {
					enemiesInRadius.push({
						index: i,
						distance: distance,
						enemy: enemy
					});
				}
			}
			
			// Sort by distance (closest first)
			enemiesInRadius.sort(function(a, b) {
				return a.distance - b.distance;
			});
			
			// Kill up to 4 enemies (the one touched + 3 nearby)
			var enemiesToKill = Math.min(4, enemiesInRadius.length);
			
			// Kill enemies starting from closest (reverse order to handle index shifting)
			for (var j = enemiesToKill - 1; j >= 0; j--) {
				var enemyData = enemiesInRadius[j];
				var enemyIndex = enemyData.index;
				
				// Find current index (may have shifted due to previous kills)
				var currentIndex = -1;
				for (var k = 0; k < enemies.length; k++) {
					if (enemies[k] === enemyData.enemy) {
						currentIndex = k;
						break;
					}
				}
				
				if (currentIndex >= 0) {
					// Kill enemy by reducing HP to 0
					var enemiesData = enemyGenerator.enemiesData;
					if (enemiesData[currentIndex]) {
						// Set HP to 0 and trigger kill
						enemiesData[currentIndex].HP = 0;
						enemyGenerator.handleEnemyHit(currentIndex);
					}
				}
			}
		}
		
		// Remove from active grenades
		var index = this.activeGrenades.indexOf(grenadeData);
		if (index > -1) {
			this.activeGrenades.splice(index, 1);
		}
	};

	/**
	 * Gets current grenade count.
	 * @returns {number} Number of grenades player has
	 */
	Grenade.prototype.getGrenadeCount = function() {
		return this.playerGrenadeCount;
	};

	/**
	 * Sets grenade count.
	 * @param count Number of grenades
	 */
	Grenade.prototype.setGrenadeCount = function(count) {
		this.playerGrenadeCount = Math.min(count, this.maxGrenades);
	};

	/**
	 * Resets grenade system (for new game).
	 */
	Grenade.prototype.reset = function() {
		// Remove all active grenades
		for (var i = 0; i < this.activeGrenades.length; i++) {
			if (this.activeGrenades[i].animation) {
				this.activeGrenades[i].animation.stop();
			}
			this.activeGrenades[i].group.destroy();
		}
		this.activeGrenades = [];
		
		// Remove all pickups
		for (var i = 0; i < this.activePickups.length; i++) {
			this.removePickup(this.activePickups[i]);
		}
		this.activePickups = [];
		
		// Reset count
		this.playerGrenadeCount = 0;
	};

	/**
	 * Cleans up all grenade-related objects.
	 */
	Grenade.prototype.clean = function() {
		this.reset();
	};

	return Grenade;
});

