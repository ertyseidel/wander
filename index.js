var http = require('http');
var fs = require('fs');

var PLAYER_TIMEOUT = 3000;
var WORLD_WIDTH = 800;
var WORLD_HEIGHT = 600;

currentWorld = new World(WORLD_WIDTH, WORLD_HEIGHT, 0);

var indexPage = fs.readFileSync('./index.html', {"encoding": "utf-8"});

function World(width, height, id){
	this.width = width;
	this.height = height;
	this.id = id;
	this.onlinePlayers = [];
	this.offlinePlayers = [];

	this.addPlayer = function(newPlayer){
		this.onlinePlayers[newPlayer.id] = newPlayer;
		if(Object.keys(this.onlinePlayers).length == 1) this.onlinePlayers[newPlayer.id].setIsIt(true);

	}

	this.getPlayers = function(){
		return this.onlinePlayers;		
	}

	this.setUserOffline = function(userID){
		var temp = this.onlinePlayers[userID];
		this.offlinePlayers.push(temp);
		delete this.onlinePlayers[userID];
		if(temp.isIt){
			newGame();
		}
	}

	this.setUserOnline = function(userID){
		var temp = this.offlinePlayers[userID];
		this.onlinePlayers.push(temp);
		delete this.offlinePlayers[userID];
	}

	this.getPlayersInArea = function(viewRect){
		areaPlayers = []
		playerIDs = Object.keys(this.onlinePlayers);
		var player;
		while(player = this.onlinePlayers[playerIDs.pop()]){
			if(player.x >= viewRect.x && player.x <= viewRect.x + viewRect.w &&
			player.y >= viewRect.y && player.y <= viewRect.y + viewRect.h){
				areaPlayers.push(player);
			}
		};
		return areaPlayers;
	}

	this.getPlayerByID = function(playerID){
		return this.onlinePlayers[playerID];
	}
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
	this.vx = 0;
	this.vy = 0;
	this.viewDist = viewDist;
	this.speed = speed;
	this.acceleration = acceleration;
	this.friction = friction;
	this.id = guid();
	this.lastSeen = Date.now();
	this.isIt = isIt;

	this.see = function(){
		this.lastSeen = Date.now();
		this.online = true;
	}

	this.setIsIt = function(isIt){
		this.isIt = isIt;
	}

	this.getViewArea = function(){
		return {"x": this.x - this.viewDist,
				"y" : this.y - this.viewDist,
				"w": this.viewDist * 2,
				"h": this.viewDist * 2};
	}

	this.toString = function(){
		return JSON.stringify({
			"x": this.x,
			"y": this.y,
			"vx": this.vx,
			"vy": this.vy,
			"id": this.id,
			"viewDist": this.viewDist,
			"speed": this.speed,
			"acceleration": this.acceleration,
			"friction": this.friction,
			"isIt": this.isIt
		});
	}

	this.updateLocation = function(world, newx, newy, vx, vy){
		if(newx < 0) newx = 0;
		if(newy < 0) newy = 0;
		if(newx > world.width) newx = world.width;
		if(newy > world.height) newy = world.height;
		this.vx = vx;
		this.vy = vy;
		this.x = newx;
		this.y = newy;
	}
}

http.createServer(function(req, res){
	requrl = req.url.split('/');
	requrl.shift();
	if(requrl[0] == ''){
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.write(indexPage);
	} else if(requrl[0] == 'createuser'){
		var newPlayer = new Player(parseInt(Math.random() * WORLD_WIDTH), parseInt(Math.random() * WORLD_HEIGHT), 75, 1.5, .3, .8, false);
		currentWorld.addPlayer(newPlayer);
		res.writeHead(200, {'Content-Type': 'text/json'});
		res.write(newPlayer.toString());
	} else if(requrl[0] == 'checkuser'){
		res.writeHead(200, {'Content-Type': 'text/json'});
		if(typeof(currentWorld.onlinePlayers[requrl[1]]) != 'undefined'){
			res.write('{"status": "true", "info": ' + currentWorld.onlinePlayers[requrl[1]].toString() + '}');
		} else if(typeof(currentWorld.offlinePlayers[requrl[1]]) != 'undefined') {
			res.write('{"status": "true", "info": ' + currentWorld.offlinePlayers[requrl[1]].toString() + '}');
		} else{
			res.write('{"status": "false"}');
		}
	} else if(requrl[0] == 'game.js'){
		res.writeHead(200, {'Content-Type': 'application/javascript'});
		res.write(fs.readFileSync('./game.js', {"encoding": "utf-8"}));
	} else if(requrl[0] == 'loop'){
		res.writeHead(200, {'Content-Type': 'text/json'});
		var givenID = requrl[1];
		var currentPlayer = currentWorld.getPlayerByID(givenID);
		if(typeof(currentPlayer) == "undefined"){
			res.writeHead(401);
		} else{
			currentPlayer.see();
			currentPlayer.updateLocation(currentWorld, requrl[2], requrl[3], requrl[4], requrl[5]); //world, x, y, vx, vy
			res.writeHead(200, {'Content-Type': 'text/json'});
			res.write('{"world" : {"id": ' + currentWorld.id + ', "width" : ' + currentWorld.width + ', "height": ' + currentWorld.height + '}, "players" : ' + JSON.stringify(currentWorld.getPlayersInArea(currentPlayer.getViewArea())) + '}');
		}
	} else{
		res.writeHead(404);
	}
	res.end();
}).listen(8080);

setInterval(function(){
	console.log("Current number of players: " + Object.keys(currentWorld.onlinePlayers).length);
}, 5000);

setInterval(function(){
	for(var p in currentWorld.onlinePlayers){
		if(Date.now() - currentWorld.onlinePlayers[p].lastSeen > PLAYER_TIMEOUT){
			currentWorld.setUserOffline(currentWorld.onlinePlayers[p].id);
		}
	}
}, 1000);

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
             .toString(16)
             .substring(1);
};
function guid() {
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
         s4() + '-' + s4() + s4() + s4();
}

console.log("Server Started!");