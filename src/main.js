// Author: @patriciogv 2015

// ============================================= VARIABLES
//
var latlon, place;
var placeCounter = 0;
var createObjectURL = (window.URL && window.URL.createObjectURL) || (window.webkitURL && window.webkitURL.createObjectURL);
var offset_target = [0, 0, 16];
var offset = [0,0];
var bMousePressed = false;
var waitFor = 100;
var timer = 1;
var timer2 = 1;
var bRandomCity = true;
var jumpEvery = 1000;

var cities = [ [1.275740, 103.844550], // Seng Wong Beo (City God)
               [1.274880, 103.841150], // Lim See Tai Chong Soo Kiu Leong Tong
               [1.276890, 103.842550],                        // Poo Thor Jee
               [1.278730, 103.840850], // Che Hian Khor Moral Uplifting Society
               [1.281090, 103.840880], // Kong Chow Wu Koon
               [1.279480, 103.841500], // Cundi Gong
               [1.282430, 103.845360],    // Zi Jing Ge Moral Uplifting Society
               [1.281260, 103.844630],   // Buddha Tooth Relic Temple
	       [1.279950, 103.846660],   // Siang Cho Keong
  	       [1.280890, 103.845850],   // Chung Shan Hoizou Association
  	       [1.280980, 103.847780],   // Thian Hock Keng
               [1.282350, 103.845320]  // Sri Mariamman Temple
               ];

// ============================================= INIT 
map = (function () {
    'use strict';

    // Leaflet Map
    var map = L.map('map',{ 
        trackResize: true,
        keyboard: false,
        maxZoom: 19.5,
        dragging: (window.self !== window.top && L.Browser.touch) ? false : true,
        tap: (window.self !== window.top && L.Browser.touch) ? false : true,
        scrollWheelZoom: 'center', 
        zoomControl: false 
    });

    // Tangram Layer
    var layer = Tangram.leafletLayer({
        scene: 'scene.yaml',
        attribution: '<a href="https://twitter.com/patriciogv" target="_blank">@patriciogv</a> | <a href="https://mapzen.com/tangram" target="_blank">Tangram</a> | &copy; OSM contributors | <a href="https://mapzen.com/" target="_blank">Mapzen</a>'
    });

    window.layer = layer;
    var scene = layer.scene;
    window.scene = scene;

    map.setView(cities[0], 16);
    var hash = new L.Hash(map);

    /***** Render loop *****/
    window.addEventListener('load', function () {
        init();
    });

    return map;
}());

function init () {

    // Scene initialized
    layer.on('init', function() {    
        window.setInterval('update()', 100);
    });
    layer.addTo(map);

    place='';
    updateLocation('');

    if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', onMotionUpdate, false);
    }

    document.addEventListener('mousemove', onMouseUpdate, false);

    map.on('mousedown', function () {
        bMousePressed = true;
        offset_target[0] = .5;
        offset_target[1] = 0;
    });

    map.on('mouseup', function () {
        bMousePressed = false;
    });
}

// ============================================= UPDATE

function update () {   // time in seconds since Jan. 01, 1970 UTC
    var speed = .025;

    if (bMousePressed) {
        speed = .1;
    }

    if (timer === 0) {
        var d = new Date();
        var t = d.getTime()/1000;
        offset_target[0] = Math.abs(Math.sin(t*0.025));
        offset_target[1] = Math.abs(Math.cos(t*0.025));
        offset_target[2] = 18+Math.sin(Math.PI*.25+t*0.02)*2.5;
        timer2++;
    } else if (!bMousePressed) {
        offset_target[2] = map.getZoom();
        timer--;
    }

    if (bRandomCity && timer2%jumpEvery === 0) {
        map.setView(cities[Math.floor(Math.random()*cities.length)]);
    } 

    var target = [(1-offset_target[1]), offset_target[0]*Math.PI];

    if (target[0] !== offset[0] || target[1] !== offset[1]) {
        offset[0] += (target[0] - offset[0])*speed;
        offset[1] += (target[1] - offset[1])*speed;
        scene.styles.lin.shaders.uniforms.u_offset = offset;
        scene.styles.roads.shaders.uniforms.u_offset = offset;
        scene.styles.simpleGrid.shaders.uniforms.u_offset = offset;
        scene.styles.numericGrid.shaders.uniforms.u_offset = offset;
        scene.styles.buildings.shaders.uniforms.u_offset = offset;
    }

    map.setZoom( map.getZoom()+(offset_target[2]-map.getZoom())*speed*0.5 );
}

function updateLocation (text) {
    if (placeCounter > text.length || place === '') {
        placeCounter = 0;
        text = '';
        latlon = map.getCenter();
        updateGeocode(latlon.lat, latlon.lng);
        setTimeout(function(){
            updateLocation('');
        }, 3000);
    } else {
        setTimeout( function(){
            document.getElementById('loc').innerHTML = text + '<span>|</span>'; 
            updateLocation(text+place.charAt(placeCounter++));
        }, 100);
    }
}

function updateGeocode (lat, lng) {

    // This is my API Key for this project. 
    // They are free! get one at https://mapzen.com/developers/sign_in
    var PELIAS_KEY = 'search--cv2Foc';

    var url = '//search.mapzen.com/v1/reverse?point.lat=' + lat + '&point.lon=' + lng + '&size=1&layers=coarse&api_key=' + PELIAS_KEY;

    // Make the request and wait for the reply
    fetch(url)
        .then(function (response) {
            // If we get a positive response...
            if (response.status !== 200) {
                console.log('Error fetching data. Status code: ' + response.status);
                return;
            }
            // ... parse it to JSON
            return response.json();
        })
        .then(function(json) {
            if (!json.features || json.features.length === 0) {
                // Sometimes reverse geocoding returns no results
                place = 'Unknown location';
            }
            else {
                place = json.features[0].properties.label;
            }
        })
        .catch(function(error) {
            console.log('Error parsing the JSON.', error)
        })
}

// ============================================= EVENT
function onMouseUpdate (e) {
    if (!bMousePressed) {
        offset_target[0] = e.pageX/screen.width;
        offset_target[1] = e.pageY/screen.height;
    }
    timer = waitFor;
}

function onMotionUpdate (e) {
    var accX = Math.round(event.accelerationIncludingGravity.x*10)/10;  
    var accY = Math.round(event.accelerationIncludingGravity.y*10)/10;  
    var motion = [ -accX,-accY ];

    if (scene.styles && motion[0] && motion[1] ) {
        offset_target[1] = motion[0]/10 + motion[1]/10;
    }
}
