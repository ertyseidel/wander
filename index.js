var http = require('http');
var fs = require('fs');

function World(width, height){
	this.width = width;
	this.height = height;
	this.players = [];

	this.addPlayer = function(newPlayer){
		this.players[newPlayer.id] = newPlayer;
	}

	this.getPlayers = function(){
		return this.players;		
	}

	this.getPlayersInArea = function(viewRect){
		areaPlayers = []
		playerIDs = Object.keys(this.players);
		var player;
		while(player = this.players[playerIDs.pop()]){
			if(player.x >= viewRect.x && player.x <= viewRect.x + viewRect.w &&
			player.y >= viewRect.y && player.y <= viewRect.y + viewRect.h){
				areaPlayers.push(player);
			}
		};
		return areaPlayers;
	}

	this.getPlayerByID = function(playerID){
		return this.players[playerID];
	}
}

function Player(startx, starty){
	this.x = startx;
	this.y = starty;
	this.viewDist = 50;
	this.id = guid();

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
			"id": this.id,
			"viewDist": this.viewDist
		});
	}

	this.updateLocation = function(world, newx, newy){
		if(newx < 0) newx = 0;
		if(newy < 0) newy = 0;
		if(newx > world.width) newx = world.width;
		if(newy > world.height) newy = world.height;
		this.x = newx;
		this.y = newy;
	}
}

world1 = new World(800, 600);

var indexPage = fs.readFileSync('./index.html', {"encoding": "utf-8"});

http.createServer(function(req, res){
	requrl = req.url.split('/');
	requrl.shift();
	if(requrl[0] == ''){
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.write(indexPage);
	} else if(requrl[0] == 'createuser'){
		var newPlayer = new Player(15, 15);
		world1.addPlayer(newPlayer);
		res.writeHead(200, {'Content-Type': 'text/json'});
		res.write(newPlayer.toString());
	} else if(requrl[0] == 'checkuser'){
		res.writeHead(200, {'Content-Type': 'text/json'});
		if(typeof(world1.players[requrl[1]]) == 'undefined'){
			res.write('{"status": "false"}');
		} else{
			res.write('{"status": "true", "info": ' + world1.players[requrl[1]].toString() + '}');
		}
	} else if(requrl[0] == 'game.js'){
		res.writeHead(200, {'Content-Type': 'application/javascript'});
		res.write(fs.readFileSync('./game.js', {"encoding": "utf-8"}));
	} else if(requrl[0] == 'loop'){
		res.writeHead(200, {'Content-Type': 'text/json'});
		var givenID = requrl[1];
		var currentPlayer = world1.getPlayerByID(givenID);
		if(typeof(currentPlayer) == "undefined"){
			res.writeHead(401);
		} else{
			currentPlayer.updateLocation(world1, requrl[2], requrl[3]);
			res.writeHead(200, {'Content-Type': 'text/json'});
			res.write(JSON.stringify(world1.getPlayersInArea(currentPlayer.getViewArea())));
		}
	} else{
		res.writeHead(404);
	}
	res.end();
}).listen(8080);

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