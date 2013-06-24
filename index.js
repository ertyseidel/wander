var http = require('http');
var fs = require('fs');
var Collisions = require('./collisions/collisions.js').Collider;
var socket = require('socket.io');

var PLAYER_TIMEOUT = 3000;
var PLAYER_IMMUNITY = 2000;
var WORLD_WIDTH = 800;
var WORLD_HEIGHT = 600;

var currentWorld = new World(WORLD_WIDTH, WORLD_HEIGHT, 0);

var indexPage = fs.readFileSync('./index.html', {"encoding": "utf-8"});

var collisionEngine = new Collisions({
	stepSize: 5,
	//collisionFunction(playerOneData, playerTwoData); 
	collisionFunction: function(player1, player2){
		if (player1.x + 5 < player2.x - 5 || player1.y + 5 < player2.y - 5 || player2.x + 5 < player1.x - 5 || player2.y + 5 < player1.y - 5){
			return false;
		}
		return [player1.playerId, player2.playerId];
	}
});
collisionEngine.numPlayers = 0;

function World(width, height, id){
	this.width = width;
	this.height = height;
	this.id = id;
	this.onlinePlayers = [];
	this.offlinePlayers = [];

	this.addPlayer = function(newPlayer){
		this.onlinePlayers[newPlayer.id] = newPlayer;
		if(Object.keys(this.onlinePlayers).length == 1) this.onlinePlayers[newPlayer.id].setIsIt(true);
		collisionEngine.addPlayer(getServerTime(), {playerId: newPlayer.id, x: newPlayer.x, y: newPlayer.y});
	};

	this.getPlayers = function(){
		return this.onlinePlayers;
	};

	this.setUserOffline = function(userID){
		var temp = this.onlinePlayers[userID];
		this.offlinePlayers.push(temp);
		delete this.onlinePlayers[userID];
		if(temp.isIt){
			newGame();
		}
		collisionEngine.removePlayer(getServerTime(), userID);
	};

	this.setUserOnline = function(userID){
		var temp = this.offlinePlayers[userID];
		this.onlinePlayers.push(temp);
		delete this.offlinePlayers[userID];
	};

	this.getPlayersInArea = function(viewRect){
		areaPlayers = [];
		playerIDs = Object.keys(this.onlinePlayers);
		var player;
		while(player = this.onlinePlayers[playerIDs.pop()]){
			if(player.x >= viewRect.x && player.x <= viewRect.x + viewRect.w &&
			player.y >= viewRect.y && player.y <= viewRect.y + viewRect.h){
				areaPlayers.push(player);
			}
		}
		return areaPlayers;
	};

	this.getPlayerById = function(playerID){
		return this.onlinePlayers[playerID];
	};
}

function newGame(){
	console.log("--------------NEW GAME-----------------");
	newWorld = new World(currentWorld.width, currentWorld.height, currentWorld.id + 1);
	for(var id in currentWorld.onlinePlayers){
		newWorld.addPlayer(currentWorld.onlinePlayers[id]);
	}
	currentWorld = newWorld;
}

function Player(startx, starty, viewDist, speed, acceleration, friction, isIt){
	this.x = startx;
	this.y = starty;
	this.oldx = 0;
	this.oldy = 0;
	this.vx = 0;
	this.vy = 0;
	this.keyx = 0;
	this.keyy = 0;
	this.viewDist = viewDist;
	this.speed = speed;
	this.acceleration = acceleration;
	this.friction = friction;
	this.id = guid();
	this.lastSeen = Date.now();
	this.isIt = isIt;
	this.immunity = 0;

	this.see = function(){
		this.lastSeen = Date.now();
		this.online = true;
	};

	this.setIsIt = function(isIt){
		if(this.isIt && !isIt && !this.isImmune()){
			this.immunity = getServerTime() + PLAYER_IMMUNITY;
		}
		this.isIt = isIt;
	};

	this.isImmune = function(){
		return this.immunity > getServerTime();
	};

	this.getViewArea = function(){
		return {"x": this.x - this.viewDist,
				"y" : this.y - this.viewDist,
				"w": this.viewDist * 2,
				"h": this.viewDist * 2};
	};

	this.updateLocation = function(world, newx, newy, vx, vy, keyx, keyy){
		this.oldx = this.x;
		this.oldy = this.y;
		if(newx < 0) newx = 0;
		if(newy < 0) newy = 0;
		if(newx > world.width) newx = world.width;
		if(newy > world.height) newy = world.height;
		this.vx = parseFloat(vx);
		this.vy = parseFloat(vy);
		this.keyx = parseFloat(keyx);
		this.keyy = parseFloat(keyy);
		this.x = parseFloat(newx);
		this.y = parseFloat(newy);
	};

}

var startTime = Date.now();
function getServerTime(){
	return Date.now() - startTime;
}

var app = http.createServer(function(req, res){
	requrl = req.url.split('/');
	requrl.shift();
	if(requrl[0] === ''){
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.write(indexPage);
	} else if(requrl[0] == 'createuser'){
		//startx, starty, viewDist, speed, acceleration, friction, isIt
		var newPlayer = new Player(parseInt(Math.random() * WORLD_WIDTH, 10), parseInt(Math.random() * WORLD_HEIGHT, 10), 75, 3, 0.3, 0.8, false);
		currentWorld.addPlayer(newPlayer);
		res.writeHead(200, {'Content-Type': 'text/json'});
		res.write(JSON.stringify(newPlayer));
	} else if(requrl[0] == 'checkuser'){
		res.writeHead(200, {'Content-Type': 'text/json'});
		if(typeof(currentWorld.onlinePlayers[requrl[1]]) != 'undefined'){
			res.write(JSON.stringify({
				"status": true,
				"info": currentWorld.onlinePlayers[requrl[1]]
			}));
		} else if(typeof(currentWorld.offlinePlayers[requrl[1]]) != 'undefined') {
			res.write(JSON.stringify({
				"status": true,
				"info": currentWorld.offlinePlayers[requrl[1]]
			}));
		} else{
			res.write(JSON.stringify({"status": "false"}));
		}
	} else if(requrl[0] == 'game.js'){
		res.writeHead(200, {'Content-Type': 'application/javascript'});
		res.write(fs.readFileSync('./game.js', {"encoding": "utf-8"}));
	} else if(requrl[0] == 'move.js'){
		res.writeHead(200, {'Content-Type': 'application/javascript'});
		res.write(fs.readFileSync('./move.js', {"encoding": "utf-8"}));
	} else if(requrl[0] == 'animations.js'){
		res.writeHead(200, {'Content-Type': 'application/javascript'});
		res.write(fs.readFileSync('./animations.js', {"encoding": "utf-8"}));
	} else{
		res.writeHead(404);
	}
	res.end();
}).listen(8080);

var io = socket.listen(app, { log: false });

io.sockets.on('connection', function(sock){
	sock.on('loop', function(data){		
		var givenID = data.id;
		var currentPlayer = currentWorld.getPlayerById(givenID);
		if(typeof(currentPlayer) == "undefined"){
			console.log("FAIL: CURRENT PLAYER UNDEFINED");
			sock.emit('fail', '{"user": "undefined"}');
		} else{
			currentPlayer.see();
			currentPlayer.updateLocation(currentWorld, data.x, data.y, data.vx, data.vy, data.keyx, data.keyy);
			var collisions = collisionEngine.handleUpdate(getServerTime(), {
				'playerId': givenID,
				'x': parseFloat(data.x),
				'y': parseFloat(data.y)
			});
			if(collisions.length > 0){
				var collision;
				while(collision = collisions.pop()){
					var a = currentWorld.getPlayerById(collision.collision[0]);
					var b = currentWorld.getPlayerById(collision.collision[1]);
					if(typeof(a) != 'undefined' && typeof(b) != 'undefined'){
						if((a.isIt && !b.isImmune()) || (b.isIt && !a.isImmune())){
							a.setIsIt(!a.isIt);
							b.setIsIt(!b.isIt);
						}
					}
				}
			}
			sock.emit('loop', '{"world" : {"id": ' + currentWorld.id + ', "width" : ' + currentWorld.width + ', "height": ' + currentWorld.height + '}, "players" : ' + JSON.stringify(currentWorld.getPlayersInArea(currentPlayer.getViewArea())) + '}');
		}
	});
});

setInterval(function(){
	console.log("Current number of players: " + Object.keys(currentWorld.onlinePlayers).length);
}, 5000);

setInterval(function(){
	for(var p in currentWorld.onlinePlayers){
		if(Date.now() - currentWorld.onlinePlayers[p].lastSeen > PLAYER_TIMEOUT){
			currentWorld.setUserOffline(currentWorld.onlinePlayers[p].id);
		}
	}
}, PLAYER_TIMEOUT);

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
             .toString(16)
             .substring(1);
}

function guid() {
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
         s4() + '-' + s4() + s4() + s4();
}

console.log("Server Started!");