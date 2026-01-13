

define(["player","shoot","enemyGenerator"], function(Player, Shoot, EnemyGenerator) {
	// background image pattern
	var bgImg = new Image();
	bgImg.src = 'img/game/bg-texture.jpg';

	/** The Game object. */
	function Game() {
		this.playground = $('#playground');

		var width = $(window).width();
		var height = $(window).height();

		// Reference resolution for scaling (1920x1080)
		this.referenceWidth = 1920;
		this.referenceHeight = 1080;
		
		// Calculate scale factor based on screen size
		// Use the smaller of width/height ratios to ensure UI fits on screen
		this.uiScale = Math.min(
			width / this.referenceWidth,
			height / this.referenceHeight,
			2.0 // Cap at 2.0x for very large screens
		);
		// Minimum scale for very small screens - increased to make UI elements bigger
		this.uiScale = Math.max(this.uiScale, 1.0);

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
		this.backgroundOverlay = new Kinetic.Rect({
			x: 0,
			y: 0,
			width: width,
			height: height,
			fill: 'black',
			opacity: 0.3
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

		// Minecraft-style health bar components
		this.maxHP = 50;
		this.heartsPerRow = 10; // Show 10 hearts per row (like Minecraft)
		// Scale heart size based on screen resolution - further reduced
		this.baseHeartSize = 12;
		this.heartSize = Math.round(this.baseHeartSize * this.uiScale);
		this.heartSpacing = Math.max(1, Math.round(1.5 * this.uiScale));
		this.heartScale = 1.2 * this.uiScale; // Scale factor to make hearts bigger
		
		// Base margin scaled by UI scale - further reduced
		this.baseMargin = 10;
		this.uiMargin = Math.round(this.baseMargin * this.uiScale);
		
		this.healthBarGroup = new Kinetic.Group({
			x: this.uiMargin,
			y: this.uiMargin
		});
		
		// Create heart icons array
		this.hearts = [];
		var totalHearts = Math.ceil(this.maxHP / 2); // Each heart = 2 HP
		for (var i = 0; i < totalHearts; i++) {
			var heartGroup = new Kinetic.Group({
				x: (i % this.heartsPerRow) * (this.heartSize + this.heartSpacing),
				y: Math.floor(i / this.heartsPerRow) * (this.heartSize + this.heartSpacing),
				scaleX: this.heartScale,
				scaleY: this.heartScale
			});
			
			// Heart background (empty/gray outline) - build pixel by pixel
			var heartBgPixels = [];
			// Top left curve
			heartBgPixels.push(new Kinetic.Rect({x: 1, y: 2, width: 2, height: 2, fill: '#2a2a2a', stroke: '#000000', strokeWidth: 0.5}));
			heartBgPixels.push(new Kinetic.Rect({x: 0, y: 3, width: 2, height: 2, fill: '#2a2a2a', stroke: '#000000', strokeWidth: 0.5}));
			heartBgPixels.push(new Kinetic.Rect({x: 0, y: 4, width: 2, height: 1, fill: '#2a2a2a', stroke: '#000000', strokeWidth: 0.5}));
			// Top right curve
			heartBgPixels.push(new Kinetic.Rect({x: 6, y: 2, width: 2, height: 2, fill: '#2a2a2a', stroke: '#000000', strokeWidth: 0.5}));
			heartBgPixels.push(new Kinetic.Rect({x: 7, y: 3, width: 2, height: 2, fill: '#2a2a2a', stroke: '#000000', strokeWidth: 0.5}));
			heartBgPixels.push(new Kinetic.Rect({x: 7, y: 4, width: 2, height: 1, fill: '#2a2a2a', stroke: '#000000', strokeWidth: 0.5}));
			// Bottom point
			heartBgPixels.push(new Kinetic.Rect({x: 2, y: 5, width: 5, height: 1, fill: '#2a2a2a', stroke: '#000000', strokeWidth: 0.5}));
			heartBgPixels.push(new Kinetic.Rect({x: 3, y: 6, width: 3, height: 1, fill: '#2a2a2a', stroke: '#000000', strokeWidth: 0.5}));
			heartBgPixels.push(new Kinetic.Rect({x: 4, y: 7, width: 1, height: 1, fill: '#2a2a2a', stroke: '#000000', strokeWidth: 0.5}));
			
			for (var p = 0; p < heartBgPixels.length; p++) {
				heartGroup.add(heartBgPixels[p]);
			}
			
			// Heart fill (red) - full heart
			var heartFillGroup = new Kinetic.Group({opacity: 0});
			heartFillGroup.add(new Kinetic.Rect({x: 1, y: 2, width: 2, height: 2, fill: '#ff0000'}));
			heartFillGroup.add(new Kinetic.Rect({x: 0, y: 3, width: 2, height: 2, fill: '#ff0000'}));
			heartFillGroup.add(new Kinetic.Rect({x: 0, y: 4, width: 2, height: 1, fill: '#ff0000'}));
			heartFillGroup.add(new Kinetic.Rect({x: 6, y: 2, width: 2, height: 2, fill: '#ff0000'}));
			heartFillGroup.add(new Kinetic.Rect({x: 7, y: 3, width: 2, height: 2, fill: '#ff0000'}));
			heartFillGroup.add(new Kinetic.Rect({x: 7, y: 4, width: 2, height: 1, fill: '#ff0000'}));
			heartFillGroup.add(new Kinetic.Rect({x: 2, y: 5, width: 5, height: 1, fill: '#ff0000'}));
			heartFillGroup.add(new Kinetic.Rect({x: 3, y: 6, width: 3, height: 1, fill: '#ff0000'}));
			heartFillGroup.add(new Kinetic.Rect({x: 4, y: 7, width: 1, height: 1, fill: '#ff0000'}));
			
			// Half heart fill (pink for half hearts) - left half only
			var heartHalfFillGroup = new Kinetic.Group({opacity: 0});
			heartHalfFillGroup.add(new Kinetic.Rect({x: 1, y: 2, width: 2, height: 2, fill: '#ff9999'}));
			heartHalfFillGroup.add(new Kinetic.Rect({x: 0, y: 3, width: 2, height: 2, fill: '#ff9999'}));
			heartHalfFillGroup.add(new Kinetic.Rect({x: 0, y: 4, width: 2, height: 1, fill: '#ff9999'}));
			
			heartGroup.add(heartFillGroup);
			heartGroup.add(heartHalfFillGroup);
			this.hearts.push({
				group: heartGroup,
				full: heartFillGroup,
				half: heartHalfFillGroup
			});
			this.healthBarGroup.add(heartGroup);
		}
		
		// Calculate HP text position
		var hpTextY = (Math.ceil(totalHearts / this.heartsPerRow)) * (this.heartSize + this.heartSpacing) + Math.round(5 * this.uiScale);
		
		// Cybersecurity-themed Agent HP panel (scaled size) - further reduced
		this.baseHpPanelWidth = 200;
		this.baseHpPanelHeight = 35;
		var hpPanelWidth = Math.round(this.baseHpPanelWidth * this.uiScale);
		var hpPanelHeight = Math.round(this.baseHpPanelHeight * this.uiScale);
		this.hpPanelBg = new Kinetic.Rect({
			x: 0,
			y: hpTextY,
			width: hpPanelWidth,
			height: hpPanelHeight,
			fill: '#0a0a0a',
			stroke: '#00ff00',
			strokeWidth: Math.max(1, Math.round(2 * this.uiScale)),
			cornerRadius: 0
		});
		
		// Inner glow effect
		var glowMargin = Math.max(1, Math.round(2 * this.uiScale));
		this.hpPanelGlow = new Kinetic.Rect({
			x: glowMargin,
			y: hpTextY + glowMargin,
			width: hpPanelWidth - (glowMargin * 2),
			height: hpPanelHeight - (glowMargin * 2),
			fill: 'rgba(0, 255, 0, 0.1)',
			stroke: '#00ff00',
			strokeWidth: Math.max(1, Math.round(1 * this.uiScale)),
			cornerRadius: 0
		});
		
		// Corner brackets (cybersecurity terminal style) - scaled - further reduced
		var baseBracketSize = 6;
		var baseBracketThickness = 2;
		var bracketSize = Math.round(baseBracketSize * this.uiScale);
		var bracketThickness = Math.max(1, Math.round(baseBracketThickness * this.uiScale));
		// Top-left bracket
		var topLeftBracket1 = new Kinetic.Rect({x: 4, y: hpTextY + 4, width: bracketSize, height: bracketThickness, fill: '#00ff00'});
		var topLeftBracket2 = new Kinetic.Rect({x: 4, y: hpTextY + 4, width: bracketThickness, height: bracketSize, fill: '#00ff00'});
		// Top-right bracket
		var topRightBracket1 = new Kinetic.Rect({x: hpPanelWidth - 4 - bracketSize, y: hpTextY + 4, width: bracketSize, height: bracketThickness, fill: '#00ff00'});
		var topRightBracket2 = new Kinetic.Rect({x: hpPanelWidth - 4 - bracketThickness, y: hpTextY + 4, width: bracketThickness, height: bracketSize, fill: '#00ff00'});
		// Bottom-left bracket
		var bottomLeftBracket1 = new Kinetic.Rect({x: 4, y: hpTextY + hpPanelHeight - 4 - bracketThickness, width: bracketSize, height: bracketThickness, fill: '#00ff00'});
		var bottomLeftBracket2 = new Kinetic.Rect({x: 4, y: hpTextY + hpPanelHeight - 4 - bracketSize, width: bracketThickness, height: bracketSize, fill: '#00ff00'});
		// Bottom-right bracket
		var bottomRightBracket1 = new Kinetic.Rect({x: hpPanelWidth - 4 - bracketSize, y: hpTextY + hpPanelHeight - 4 - bracketThickness, width: bracketSize, height: bracketThickness, fill: '#00ff00'});
		var bottomRightBracket2 = new Kinetic.Rect({x: hpPanelWidth - 4 - bracketThickness, y: hpTextY + hpPanelHeight - 4 - bracketSize, width: bracketThickness, height: bracketSize, fill: '#00ff00'});
		
		// Agent HP text label (cybersecurity terminal style) - scaled font - further reduced
		var baseFontSize = 14;
		var baseTextX = 15;
		var baseTextY = 8;
		this.healthBarText = new Kinetic.Text({
			x: Math.round(baseTextX * this.uiScale),
			y: hpTextY + Math.round(baseTextY * this.uiScale),
			fontSize: Math.round(baseFontSize * this.uiScale),
			fontStyle: 'bold',
			fontFamily: 'VT323, Courier, monospace',
			fill: '#00ff00',
			text: '> AGENT_HP: 50',
			shadowColor: '#00ff00',
			shadowBlur: Math.round(6 * this.uiScale),
			shadowOffset: {x: 0, y: 0},
			shadowOpacity: 0.8
		});
		
		this.healthBarGroup.add(this.hpPanelBg);
		this.healthBarGroup.add(this.hpPanelGlow);
		this.healthBarGroup.add(topLeftBracket1);
		this.healthBarGroup.add(topLeftBracket2);
		this.healthBarGroup.add(topRightBracket1);
		this.healthBarGroup.add(topRightBracket2);
		this.healthBarGroup.add(bottomLeftBracket1);
		this.healthBarGroup.add(bottomLeftBracket2);
		this.healthBarGroup.add(bottomRightBracket1);
		this.healthBarGroup.add(bottomRightBracket2);
		this.healthBarGroup.add(this.healthBarText);

		// Score bar components - positioned below Agent HP
		var scoreBarSpacing = Math.round(8 * this.uiScale);
		this.scoreBarGroup = new Kinetic.Group({
			x: this.uiMargin, // Same x position as HP bar group
			y: this.uiMargin + hpTextY + hpPanelHeight + scoreBarSpacing // Below HP panel with scaled spacing
		});
		
		// Cybersecurity-themed Score panel (scaled size) - further reduced
		this.baseScorePanelWidth = 200;
		this.baseScorePanelHeight = 35;
		var scorePanelWidth = Math.round(this.baseScorePanelWidth * this.uiScale);
		var scorePanelHeight = Math.round(this.baseScorePanelHeight * this.uiScale);
		this.scorePanelBg = new Kinetic.Rect({
			x: 0,
			y: 0,
			width: scorePanelWidth,
			height: scorePanelHeight,
			fill: '#0a0a0a',
			stroke: '#00ffff',
			strokeWidth: Math.max(1, Math.round(2 * this.uiScale)),
			cornerRadius: 0
		});
		
		// Inner glow effect (cyan)
		var scoreGlowMargin = Math.max(1, Math.round(2 * this.uiScale));
		this.scorePanelGlow = new Kinetic.Rect({
			x: scoreGlowMargin,
			y: scoreGlowMargin,
			width: scorePanelWidth - (scoreGlowMargin * 2),
			height: scorePanelHeight - (scoreGlowMargin * 2),
			fill: 'rgba(0, 255, 255, 0.1)',
			stroke: '#00ffff',
			strokeWidth: Math.max(1, Math.round(1 * this.uiScale)),
			cornerRadius: 0
		});
		
		// Corner brackets (cyan) - smaller
		// Top-left bracket
		var scoreTopLeftBracket1 = new Kinetic.Rect({x: 4, y: 4, width: bracketSize, height: bracketThickness, fill: '#00ffff'});
		var scoreTopLeftBracket2 = new Kinetic.Rect({x: 4, y: 4, width: bracketThickness, height: bracketSize, fill: '#00ffff'});
		// Top-right bracket
		var scoreTopRightBracket1 = new Kinetic.Rect({x: scorePanelWidth - 4 - bracketSize, y: 4, width: bracketSize, height: bracketThickness, fill: '#00ffff'});
		var scoreTopRightBracket2 = new Kinetic.Rect({x: scorePanelWidth - 4 - bracketThickness, y: 4, width: bracketThickness, height: bracketSize, fill: '#00ffff'});
		// Bottom-left bracket
		var scoreBottomLeftBracket1 = new Kinetic.Rect({x: 4, y: scorePanelHeight - 4 - bracketThickness, width: bracketSize, height: bracketThickness, fill: '#00ffff'});
		var scoreBottomLeftBracket2 = new Kinetic.Rect({x: 4, y: scorePanelHeight - 4 - bracketSize, width: bracketThickness, height: bracketSize, fill: '#00ffff'});
		// Bottom-right bracket
		var scoreBottomRightBracket1 = new Kinetic.Rect({x: scorePanelWidth - 4 - bracketSize, y: scorePanelHeight - 4 - bracketThickness, width: bracketSize, height: bracketThickness, fill: '#00ffff'});
		var scoreBottomRightBracket2 = new Kinetic.Rect({x: scorePanelWidth - 4 - bracketThickness, y: scorePanelHeight - 4 - bracketSize, width: bracketThickness, height: bracketSize, fill: '#00ffff'});
		
		// Score text (cybersecurity terminal style) - scaled font
		this.scoreBarText = new Kinetic.Text({
			x: Math.round(baseTextX * this.uiScale),
			y: Math.round(baseTextY * this.uiScale),
			fontSize: Math.round(baseFontSize * this.uiScale),
			fontStyle: 'bold',
			fontFamily: 'VT323, Courier, monospace',
			fill: '#00ffff',
			text: '> THREAT_ELIMINATED: 0',
			shadowColor: '#00ffff',
			shadowBlur: Math.round(6 * this.uiScale),
			shadowOffset: {x: 0, y: 0},
			shadowOpacity: 0.8
		});
		
		this.scoreBarGroup.add(this.scorePanelBg);
		this.scoreBarGroup.add(this.scorePanelGlow);
		this.scoreBarGroup.add(scoreTopLeftBracket1);
		this.scoreBarGroup.add(scoreTopLeftBracket2);
		this.scoreBarGroup.add(scoreTopRightBracket1);
		this.scoreBarGroup.add(scoreTopRightBracket2);
		this.scoreBarGroup.add(scoreBottomLeftBracket1);
		this.scoreBarGroup.add(scoreBottomLeftBracket2);
		this.scoreBarGroup.add(scoreBottomRightBracket1);
		this.scoreBarGroup.add(scoreBottomRightBracket2);
		this.scoreBarGroup.add(this.scoreBarText);

		// Instruction panel components - positioned in top right - further reduced
		var baseInstructionPanelWidth = 230;
		var baseInstructionPanelHeight = 80;
		this.instructionPanelWidth = Math.round(baseInstructionPanelWidth * this.uiScale);
		this.instructionPanelHeight = Math.round(baseInstructionPanelHeight * this.uiScale);
		
		// Store base values for recalculation on resize
		this.baseInstructionPanelWidth = baseInstructionPanelWidth;
		this.baseInstructionPanelHeight = baseInstructionPanelHeight;
		
		// Calculate instruction panel position with overlap protection
		var instructionPanelX = width - this.instructionPanelWidth - this.uiMargin;
		// Prevent overlap with health bar (check if there's enough space)
		var healthBarRightEdge = this.uiMargin + hpPanelWidth;
		if (instructionPanelX < healthBarRightEdge + this.uiMargin) {
			// Move instruction panel below health bar if overlap detected
			instructionPanelX = this.uiMargin;
		}
		
		this.instructionPanelGroup = new Kinetic.Group({
			x: instructionPanelX,
			y: this.uiMargin
		});
		
		// Cybersecurity-themed Instruction panel
		this.instructionPanelBg = new Kinetic.Rect({
			x: 0,
			y: 0,
			width: this.instructionPanelWidth,
			height: this.instructionPanelHeight,
			fill: '#0a0a0a',
			stroke: '#ffff00',
			strokeWidth: Math.max(1, Math.round(2 * this.uiScale)),
			cornerRadius: 0
		});
		
		// Inner glow effect (yellow)
		var instructionGlowMargin = Math.max(1, Math.round(2 * this.uiScale));
		this.instructionPanelGlow = new Kinetic.Rect({
			x: instructionGlowMargin,
			y: instructionGlowMargin,
			width: this.instructionPanelWidth - (instructionGlowMargin * 2),
			height: this.instructionPanelHeight - (instructionGlowMargin * 2),
			fill: 'rgba(255, 255, 0, 0.1)',
			stroke: '#ffff00',
			strokeWidth: Math.max(1, Math.round(1 * this.uiScale)),
			cornerRadius: 0
		});
		
		// Corner brackets (yellow) - scaled
		var instructionBracketSize = bracketSize;
		var instructionBracketThickness = bracketThickness;
		// Top-left bracket
		var instructionTopLeftBracket1 = new Kinetic.Rect({x: 4, y: 4, width: instructionBracketSize, height: instructionBracketThickness, fill: '#ffff00'});
		var instructionTopLeftBracket2 = new Kinetic.Rect({x: 4, y: 4, width: instructionBracketThickness, height: instructionBracketSize, fill: '#ffff00'});
		// Top-right bracket
		var instructionTopRightBracket1 = new Kinetic.Rect({x: this.instructionPanelWidth - 4 - instructionBracketSize, y: 4, width: instructionBracketSize, height: instructionBracketThickness, fill: '#ffff00'});
		var instructionTopRightBracket2 = new Kinetic.Rect({x: this.instructionPanelWidth - 4 - instructionBracketThickness, y: 4, width: instructionBracketThickness, height: instructionBracketSize, fill: '#ffff00'});
		// Bottom-left bracket
		var instructionBottomLeftBracket1 = new Kinetic.Rect({x: 4, y: this.instructionPanelHeight - 4 - instructionBracketThickness, width: instructionBracketSize, height: instructionBracketThickness, fill: '#ffff00'});
		var instructionBottomLeftBracket2 = new Kinetic.Rect({x: 4, y: this.instructionPanelHeight - 4 - instructionBracketSize, width: instructionBracketThickness, height: instructionBracketSize, fill: '#ffff00'});
		// Bottom-right bracket
		var instructionBottomRightBracket1 = new Kinetic.Rect({x: this.instructionPanelWidth - 4 - instructionBracketSize, y: this.instructionPanelHeight - 4 - instructionBracketThickness, width: instructionBracketSize, height: instructionBracketThickness, fill: '#ffff00'});
		var instructionBottomRightBracket2 = new Kinetic.Rect({x: this.instructionPanelWidth - 4 - instructionBracketThickness, y: this.instructionPanelHeight - 4 - instructionBracketSize, width: instructionBracketThickness, height: instructionBracketSize, fill: '#ffff00'});
		
		// Instruction text lines (cybersecurity terminal style) - scaled - further reduced
		var baseInstructionTextX = 15;
		var baseInstructionTitleY = 8;
		var baseInstructionLineSpacing = 20;
		var baseInstructionFontSize = 12;
		
		this.instructionTitleText = new Kinetic.Text({
			x: Math.round(baseInstructionTextX * this.uiScale),
			y: Math.round(baseInstructionTitleY * this.uiScale),
			fontSize: Math.round(baseFontSize * this.uiScale),
			fontStyle: 'bold',
			fontFamily: 'VT323, Courier, monospace',
			fill: '#ffff00',
			text: '> CONTROLS:',
			shadowColor: '#ffff00',
			shadowBlur: Math.round(6 * this.uiScale),
			shadowOffset: {x: 0, y: 0},
			shadowOpacity: 0.8
		});
		
		this.instructionMoveText = new Kinetic.Text({
			x: Math.round(baseInstructionTextX * this.uiScale),
			y: Math.round((baseInstructionTitleY + baseInstructionLineSpacing) * this.uiScale),
			fontSize: Math.round(baseInstructionFontSize * this.uiScale),
			fontFamily: 'VT323, Courier, monospace',
			fill: '#ffff00',
			text: '  MOVE: W/A/S/D',
			shadowColor: '#ffff00',
			shadowBlur: Math.round(4 * this.uiScale),
			shadowOffset: {x: 0, y: 0},
			shadowOpacity: 0.6
		});
		
		this.instructionShootText = new Kinetic.Text({
			x: Math.round(baseInstructionTextX * this.uiScale),
			y: Math.round((baseInstructionTitleY + baseInstructionLineSpacing * 2) * this.uiScale),
			fontSize: Math.round(baseInstructionFontSize * this.uiScale),
			fontFamily: 'VT323, Courier, monospace',
			fill: '#ffff00',
			text: '  SHOOT: MOUSE CLICK',
			shadowColor: '#ffff00',
			shadowBlur: Math.round(4 * this.uiScale),
			shadowOffset: {x: 0, y: 0},
			shadowOpacity: 0.6
		});
		
		this.instructionGoalText = new Kinetic.Text({
			x: Math.round(baseInstructionTextX * this.uiScale),
			y: Math.round((baseInstructionTitleY + baseInstructionLineSpacing * 3) * this.uiScale),
			fontSize: Math.round(baseInstructionFontSize * this.uiScale),
			fontFamily: 'VT323, Courier, monospace',
			fill: '#ffff00',
			text: '  GOAL: SURVIVE',
			shadowColor: '#ffff00',
			shadowBlur: Math.round(4 * this.uiScale),
			shadowOffset: {x: 0, y: 0},
			shadowOpacity: 0.6
		});
		
		this.instructionPanelGroup.add(this.instructionPanelBg);
		this.instructionPanelGroup.add(this.instructionPanelGlow);
		this.instructionPanelGroup.add(instructionTopLeftBracket1);
		this.instructionPanelGroup.add(instructionTopLeftBracket2);
		this.instructionPanelGroup.add(instructionTopRightBracket1);
		this.instructionPanelGroup.add(instructionTopRightBracket2);
		this.instructionPanelGroup.add(instructionBottomLeftBracket1);
		this.instructionPanelGroup.add(instructionBottomLeftBracket2);
		this.instructionPanelGroup.add(instructionBottomRightBracket1);
		this.instructionPanelGroup.add(instructionBottomRightBracket2);
		this.instructionPanelGroup.add(this.instructionTitleText);
		this.instructionPanelGroup.add(this.instructionMoveText);
		this.instructionPanelGroup.add(this.instructionShootText);
		this.instructionPanelGroup.add(this.instructionGoalText);

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
		this.scoreUpdateInterval = null;
		this.lastKillCount = 0;
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
		this.firstLayer.add(this.backgroundOverlay);
		this.mainLayer.add(this.shootGroup);
		this.mainLayer.add(this.enemyGroup);
		this.mainLayer.add(this.playerGroup);
		this.mainLayer.add(this.healthBarGroup);
		this.mainLayer.add(this.scoreBarGroup);
		this.mainLayer.add(this.instructionPanelGroup);
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
		
		// Track threat eliminated (kill count) updates
		self.lastKillCount = 0;
		self.scoreUpdateInterval = setInterval(function() {
			if (self.enemyGenerator && self.enemyGenerator.killCount !== undefined) {
				var currentKills = self.enemyGenerator.killCount;
				if (currentKills > self.lastKillCount) {
					self.lastKillCount = currentKills;
					self.refreshScore();
				}
			}
		}, 100); // Check every 100ms
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
		this.lastKillCount = 0; // Reset kill count tracking
		this.gameEnded = false; // Reset game ended flag
		this.player.setSpeed(this.playerSpeed);
		this.enemyGenerator.clean();
		this.enemyGenerator.setDifficulty(this.difficulty);
		this.refreshText();
		this.refreshScore();

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
			// Pause immediately and show popup
			this.pause();
			setTimeout(function() {
				self.gameOverCallback(result);
			}, 500); // Short delay for visual effect
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
	 * Renders up-to-date Minecraft-style health bar with hearts.
	 */
	Game.prototype.refreshText = function() {
		// Ensure HP is never displayed as negative
		var displayHP = Math.max(0, this.playerHP);
		
		// Update hearts based on HP (each heart = 2 HP, like Minecraft)
		var totalHearts = Math.ceil(this.maxHP / 2);
		for (var i = 0; i < totalHearts; i++) {
			var heartHP = displayHP - (i * 2);
			var heart = this.hearts[i];
			
			if (heartHP >= 2) {
				// Full heart
				heart.full.setOpacity(1);
				heart.half.setOpacity(0);
			} else if (heartHP >= 1) {
				// Half heart
				heart.full.setOpacity(0);
				heart.half.setOpacity(1);
			} else {
				// Empty heart
				heart.full.setOpacity(0);
				heart.half.setOpacity(0);
			}
		}
		
		// Update text with cybersecurity theme
		this.healthBarText.setText('> AGENT_HP: ' + displayHP);
		
		this.mainLayer.draw();
	};

	/**
	 * Renders up-to-date threat eliminated count.
	 */
	Game.prototype.refreshScore = function() {
		// Display kill count (threats eliminated) like in leaderboard
		var killCount = this.enemyGenerator ? this.enemyGenerator.killCount : 0;
		this.scoreBarText.setText('> THREAT_ELIMINATED: ' + killCount);
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
	 * Calculate UI scale factor based on screen dimensions.
	 * @param width screen width
	 * @param height screen height
	 * @return {number} scale factor
	 */
	Game.prototype.calculateUIScale = function(width, height) {
		var scale = Math.min(
			width / this.referenceWidth,
			height / this.referenceHeight,
			2.0 // Cap at 2.0x for very large screens
		);
		// Minimum scale for very small screens - increased to make UI elements bigger
		return Math.max(scale, 1.0);
	};

	/**
	 * Resize the playground and recalculate UI elements.
	 * @param width new width
	 * @param height new height
	 */
	Game.prototype.resizePlayground = function(width, height) {
		// Recalculate UI scale
		var oldScale = this.uiScale;
		this.uiScale = this.calculateUIScale(width, height);
		
		// Update base margin
		this.uiMargin = Math.round(this.baseMargin * this.uiScale);
		
		// Resize canvas
		this.stage.setWidth(width);
		this.stage.setHeight(height);
		this.background.setWidth(width);
		this.background.setHeight(height);
		this.backgroundOverlay.setWidth(width);
		this.backgroundOverlay.setHeight(height);
		this.foreground.setWidth(width);
		this.foreground.setHeight(height);
		
		// Only recalculate UI if scale changed significantly (more than 5%)
		if (Math.abs(this.uiScale - oldScale) > 0.05) {
			// Update instruction panel size
			this.instructionPanelWidth = Math.round(this.baseInstructionPanelWidth * this.uiScale);
			this.instructionPanelHeight = Math.round(this.baseInstructionPanelHeight * this.uiScale);
			
			// Update instruction panel background
			if (this.instructionPanelBg) {
				this.instructionPanelBg.setWidth(this.instructionPanelWidth);
				this.instructionPanelBg.setHeight(this.instructionPanelHeight);
				this.instructionPanelBg.setStrokeWidth(Math.max(1, Math.round(2 * this.uiScale)));
			}
			if (this.instructionPanelGlow) {
				var instructionGlowMargin = Math.max(1, Math.round(2 * this.uiScale));
				this.instructionPanelGlow.setX(instructionGlowMargin);
				this.instructionPanelGlow.setY(instructionGlowMargin);
				this.instructionPanelGlow.setWidth(this.instructionPanelWidth - (instructionGlowMargin * 2));
				this.instructionPanelGlow.setHeight(this.instructionPanelHeight - (instructionGlowMargin * 2));
				this.instructionPanelGlow.setStrokeWidth(Math.max(1, Math.round(1 * this.uiScale)));
			}
			
			// Update HP panel size
			if (this.hpPanelBg) {
				var hpPanelWidth = Math.round(this.baseHpPanelWidth * this.uiScale);
				var hpPanelHeight = Math.round(this.baseHpPanelHeight * this.uiScale);
				this.hpPanelBg.setWidth(hpPanelWidth);
				this.hpPanelBg.setHeight(hpPanelHeight);
				this.hpPanelBg.setStrokeWidth(Math.max(1, Math.round(2 * this.uiScale)));
			}
			if (this.hpPanelGlow) {
				var glowMargin = Math.max(1, Math.round(2 * this.uiScale));
				var hpPanelWidth = Math.round(this.baseHpPanelWidth * this.uiScale);
				var hpPanelHeight = Math.round(this.baseHpPanelHeight * this.uiScale);
				this.hpPanelGlow.setX(glowMargin);
				this.hpPanelGlow.setY(this.hpPanelBg.getY() + glowMargin);
				this.hpPanelGlow.setWidth(hpPanelWidth - (glowMargin * 2));
				this.hpPanelGlow.setHeight(hpPanelHeight - (glowMargin * 2));
				this.hpPanelGlow.setStrokeWidth(Math.max(1, Math.round(1 * this.uiScale)));
			}
			
			// Update score panel size
			if (this.scorePanelBg) {
				var scorePanelWidth = Math.round(this.baseScorePanelWidth * this.uiScale);
				var scorePanelHeight = Math.round(this.baseScorePanelHeight * this.uiScale);
				this.scorePanelBg.setWidth(scorePanelWidth);
				this.scorePanelBg.setHeight(scorePanelHeight);
				this.scorePanelBg.setStrokeWidth(Math.max(1, Math.round(2 * this.uiScale)));
			}
			if (this.scorePanelGlow) {
				var scoreGlowMargin = Math.max(1, Math.round(2 * this.uiScale));
				var scorePanelWidth = Math.round(this.baseScorePanelWidth * this.uiScale);
				var scorePanelHeight = Math.round(this.baseScorePanelHeight * this.uiScale);
				this.scorePanelGlow.setX(scoreGlowMargin);
				this.scorePanelGlow.setY(scoreGlowMargin);
				this.scorePanelGlow.setWidth(scorePanelWidth - (scoreGlowMargin * 2));
				this.scorePanelGlow.setHeight(scorePanelHeight - (scoreGlowMargin * 2));
				this.scorePanelGlow.setStrokeWidth(Math.max(1, Math.round(1 * this.uiScale)));
			}
			
			// Update instruction panel text sizes - updated to match new base sizes
			var baseFontSize = 14;
			var baseInstructionFontSize = 12;
			this.instructionTitleText.setFontSize(Math.round(baseFontSize * this.uiScale));
			this.instructionTitleText.setShadowBlur(Math.round(6 * this.uiScale));
			this.instructionMoveText.setFontSize(Math.round(baseInstructionFontSize * this.uiScale));
			this.instructionMoveText.setShadowBlur(Math.round(4 * this.uiScale));
			this.instructionShootText.setFontSize(Math.round(baseInstructionFontSize * this.uiScale));
			this.instructionShootText.setShadowBlur(Math.round(4 * this.uiScale));
			this.instructionGoalText.setFontSize(Math.round(baseInstructionFontSize * this.uiScale));
			this.instructionGoalText.setShadowBlur(Math.round(4 * this.uiScale));
			
			// Update health and score text sizes
			this.healthBarText.setFontSize(Math.round(baseFontSize * this.uiScale));
			this.healthBarText.setShadowBlur(Math.round(6 * this.uiScale));
			this.scoreBarText.setFontSize(Math.round(baseFontSize * this.uiScale));
			this.scoreBarText.setShadowBlur(Math.round(6 * this.uiScale));
		}
		
		// Reposition instruction panel in top right with overlap protection
		if (this.instructionPanelGroup) {
			var instructionPanelX = width - this.instructionPanelWidth - this.uiMargin;
			// Get health bar width
			var hpPanelWidth = Math.round(this.baseHpPanelWidth * this.uiScale);
			var healthBarRightEdge = this.uiMargin + hpPanelWidth;
			
			// Prevent overlap - if screen is too narrow, move instruction panel below
			if (instructionPanelX < healthBarRightEdge + this.uiMargin) {
				instructionPanelX = this.uiMargin;
			}
			this.instructionPanelGroup.setX(instructionPanelX);
		}
		
		this.stage.draw();
	};

	return Game;
});
