// This is a template for a Node.js scraper on morph.io (https://morph.io)

var cheerio = require("cheerio");
var request = require("request");
var sqlite3 = require("sqlite3").verbose();
var axios = require('axios');

function initDatabase(callback) {
	// Set up sqlite database.
	var db = new sqlite3.Database("data.sqlite");
	db.serialize(function() {
		db.run("CREATE TABLE IF NOT EXISTS data (name TEXT)");
		db.run("CREATE TABLE IF NOT EXISTS pose (id NUMBER, uuid TEXT, render_count NUMBER)");
		callback(db);
	});
}

function updateRow(db, value) {
	// Insert some data.
	var statement = db.prepare("INSERT INTO data VALUES (?)");
	statement.run(value);
	statement.finalize();
}

function readRows(db) {
	// Read some data.
	db.each("SELECT rowid AS id, name FROM data", function(err, row) {
		console.log(row.id + ": " + row.name);
	});
}

function fetchPage(url, callback) {
	// Use request to read in pages.
	request(url, function (error, response, body) {
		if (error) {
			console.log("Error requesting page: " + error);
			return;
		}

		callback(body);
	});
}

function run(db) {
	// Use request to read in pages.
	fetchPage("https://morph.io", function (body) {
		// Use cheerio to find things in the page with css selectors.
		var $ = cheerio.load(body);

		var elements = $("div.media-body span.p-name").each(function () {
			var value = $(this).text().trim();
			updateRow(db, value);
		});

		readRows(db);

		db.close();
	});
}

function fetchPose(db) {
    for (let i = 1; i <= 2; i++) {
        axios.post('https://api.figurosity.com/public/v1/poses', {"page": i,"models":[],"cameras":[],"gender":[],"style":[],"action":[],"props":[]})
            .then(response => {
                return fetchFromApi(db, response.data.poses.data);
            })
            .then(() => console.log('DONE Page ' + i));
    }
}

function fetchFromApi(db, data) {
    return Promise.all(data.map(p => convertAndSavePose(db, p)));
}

function convertAndSavePose(db, data) {
    
    var pose = {
        id: data.id,
        uuid: data.uuid,
        render_count: data.render_count
    };

    console.log(`Save poses id=${data.id}`);

    var statement = db.prepare("INSERT INTO data VALUES (?,?,?)");
	statement.run(pose.id, pose.uuid, pose.render_count);
	statement.finalize();

    return pose;
}

initDatabase(fetchPose);
