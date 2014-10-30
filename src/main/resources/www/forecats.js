function Forecats(features, catId) {
  var $ = function(id) {
        return document.getElementById(id);
      },
      round = function(k) {
        return Math.floor(k * 10e5) / 10e5; 
      },

      // we (would prefer to) cache weather/location for coordinates
      // so that repeated attempts to get cat gifs don't exhaust our
      // free forecast API key usage/limits!
      possiblyCache = function(k, v) {
        if(features.storage) { 
          var cached = possiblyCached(k),
              update = cached || {};

          if('w' in v) update.w = v.w;
          if('l' in v) update.l = v.l;
          sessionStorage.setItem(k, JSON.stringify(update));
        }
      },
      possiblyCached = function(k) {
        if(features.storage) {
          return JSON.parse(sessionStorage.getItem(k));
        }
        else return false;
      },

      catQuery = function(tag) {
        var http = new XMLHttpRequest(),
            handler = function() {
              var id = http.response;
              displayCat(id);
            };

        http.addEventListener('load', handler);
        http.open('get', '/cats/' + (tag || 'random'));
        http.send();
      },
      displayCat = (function() {
        var container = $('catbox'),
            useGif = features.touch || !features.video,
            emptyContainer = function() {
              while(container.firstChild)
                container.removeChild(container.firstChild);
            };

        return function(id) {
          var newCat = document.createElement(useGif ? 'img' : 'video'),
              file = (useGif ? '/giphy.gif' : '/giphy.mp4');

          if(!useGif) {
            newCat.type = 'video/mp4';
            newCat.autoplay = 'true';
            newCat.loop = 'true';
          }

          newCat.src ='http://media.giphy.com/media/' + id + file;
          
          emptyContainer();
          container.appendChild(newCat);
        };
      }()),

      // forecast weather requests require latitude/longitude
      weatherFromCoordinates = function(coords) {
        var query = [coords.lat, coords.lng].join(','),
            cached = possiblyCached(query);

        if(cached) displayWeather(cached)
        else {
          var http = new XMLHttpRequest(),
              handler = function() {
                var response = JSON.parse(http.response);

                displayWeather(response);
                possiblyCache(query, response);
                location.hash = query;
              };

          http.addEventListener('load', handler);
          http.open('get', '/weather/' + query);
          http.send();
        }
      },
      // getting weather from a search query requires getting
      // coordinates from the query and passing them along
      // to weatherFromCoordinates
      weatherFromQuery = function(query) {
        var g = new google.maps.Geocoder(),
            address = { address: query },
            handler = function(xs) {
              var x = xs[0],
                  coords = {
                    lat: round(x.geometry.location.lat()),
                    lng: round(x.geometry.location.lng())
                  };

              weatherFromCoordinates(coords);
              displayLocation(x.formatted_address);
            };

        g.geocode(address, handler);
      },
      displayWeather = function(weather) {
        console.log('weather:', weather);
      },

      locationFromCoordinates = function(coords) {
        var query = [coords.lat, coords.lng].join(','),
            cached = possiblyCached(query);

        if(cached && cached.l) displayLocation(cached.l);
        else {
          var g = new google.maps.GeoCoder(),
              latLng = new google.maps.LatLng(coords.lat, coords.lng),
              handler = function(xs) {
                var x = xs[0];

                displayLocation(x.formatted_address);
                // just save the .l key for query in storage
                // possiblyCache(query, x.formatted_address);
              };

          g.geocode(latLng, handler);
        }
      },
      displayLocation = function(l) {
        console.log('location:', l);
      },
  
  /* TODO:
    - add any UI modification above
    - change displayLocation, displayWeather
    - add initial page load nonsense below
  */
  if(features.geolocation) {
  }
  
  displayCat(catId);
}
