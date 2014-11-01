function Forecats() {

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

      // forecast weather requests require latitude/longitude
      weatherFromCoordinates = function(coords, errorCallback) {
        console.log(coords);
        var query = [coords.lat, coords.lng].join(','),
            cached = possiblyCached(query);

        if(cached && 'w' in cached) displayWeather(cached.w);
        else {
          var http = new XMLHttpRequest(),
              handler = function() {
                if(http.status == 200) {
                  var response = JSON.parse(http.response);

                  displayWeather(response);
                  possiblyCache(query, { w: response });

                  location.hash = query;
                  $('forecastLink').href = 'https://forecast.io/#/f/' + query;
                }
                else if(errorCallback) errorCallback();
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
            buildLocation = function(components) {
              var types = ["locality", "administrative_area_level_1", "country"],
                  loc = [];

              for(var i=0; i<components.length; i++) {
                for(var j=0; j<components[i].types.length; j++)
                  if(types.indexOf(components[i].types[j]) >= 0) {
                    loc.push(components[i].short_name);
                    break;
                  }
              }

              return loc.join(', ');
            },
            handler = function(xs) {
              var x = xs[0],
                  coords = {
                    lat: round(x.geometry.location.lat()),
                    lng: round(x.geometry.location.lng())
                  },
                  loc = buildLocation(x.address_components);

              weatherFromCoordinates(coords);
              //displayLocation(x.formatted_address);
              displayLocation(loc);
            };

        g.geocode(address, handler);
      },
      
      locationFromCoordinates = function(coords) {
        console.log("getting location from coordinates:", coords);
        var query = [coords.lat, coords.lng].join(','),
            cached = possiblyCached(query);

        if(cached && 'l' in cached) displayLocation(cached.l);
        else {
          console.log(coords);
          var g = new google.maps.Geocoder(),
              latLng = new google.maps.LatLng(coords.lat, coords.lng),
              handler = function(xs) {
                var x = xs[0];

                displayLocation(x.formatted_address);
                possiblyCache(query, { l: x.formatted_address });
              };

          g.geocode({ location: latLng }, handler);
        }
      },
      
      skycons = new Skycons({ color: "#0F0706", resizeClear: true }),
      displayWeather = function(weather) {
        
        //$('icon').className = ['icon', weather.icon].join(' ');
        skycons.set('icon', weather.icon);
        skycons.play();

        $('summary').innerText = weather.summary;
        $('temperature').innerText = weather.temperature;
        $('apparentTemperature').innerText = weather.apparentTemperature;
        $('temperatureMax').innerText = weather.temperatureMax;
        $('temperatureMin').innerText = weather.temperatureMin;

        // and finally...
        $('weatherbox').classList.remove('hidden');
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
          $('giphyLink').href = 'http://giphy.com/gifs/' + id;
        };
      }()),
      displayLocation = function(l) {
        $('query').value = l;
        $('searchbox').classList.remove('active');
      };

  return {
    initialize: function(catId) {

      // to deal with async google maps loading
      var google = google || {};
      google.cmd = google.cmd || {};
      google.cmd.push = function(callback) {
        var timeout = google ? 0 : 50,
            t = setInterval(function() {
              if(google) {
                giveUp();
                callback();
              }
            }, timeout),
            giveUp = function() {
              clearInterval(t); 
            };
        
        setTimeout(giveUp, 60 * timeout);
      };
      
      (function searchSetup() {
        var searchHandler = function() {
              var query = $('query').value;

              $('weatherbox').classList.add('hidden');
              google.cmd.push(function() {
                weatherFromQuery(query);
              });
            },
            keypressHandler = function(evt) {
              if(evt.keyCode == 13) searchHandler(); 
            },
            clickHandler = searchHandler;

        $('submit').addEventListener('click', clickHandler);
        $('query').addEventListener('keypress', keypressHandler);
      }());

      (function weatherSetup() {
        // show the weather for coordinates in hash 
        if(location.hash.length) {
          var hc = location.hash.slice(1).split(','),
              coords = {
                lat: hc[0],
                lng: hc[1]
              },
              badHashHandler = function() {
                window.location.href = '/';
              };

          weatherFromCoordinates(coords, badHashHandler);
          google.cmd.push(function() { 
            locationFromCoordinates(coords);
          });
        }
        // show weather for current position as calculated
        // by navigator.geolocation.getCurrentPosition
        else if(features.geolocation) {
          var cached = possiblyCached('geo');
          if(cached) {
            weatherFromCoordinates(cached);
            google.cmd.push(function() {
              locationFromCoordinates(cached);
            });
          }
          else {
          console.log('geolocating');
          navigator.geolocation.getCurrentPosition(
            function(posn) {
              var coords = {
                lat: round(posn.coords.latitude),
                lng: round(posn.coords.longitude)
              };
              
              weatherFromCoordinates(coords);
              google.cmd.push(function() {
                locationFromCoordinates(coords);
              });
              possiblyCache('geo', coords);
            },
            null,
            { timeout: 3000 });
          }
        }
      }());

      displayCat(catId);
    }
  };
}

var features = {
  geolocation: 'geolocation' in navigator,
  touch: 'ontouchstart' in window || !!(navigator.msMaxTouchPoints),
  video: (function() {
    var elem = document.createElement('video');
    return !!elem.canPlayType && (elem.canPlayType('video/mp4') != '');
  })(),
  storage: (function() {
    try {
      sessionStorage.setItem('tmp', 'forecats');
      sessionStorage.removeItem('tmp');
      return true;
    }
    catch(e) { return false; }
  })()
};
