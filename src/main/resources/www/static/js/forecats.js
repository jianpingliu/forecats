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

          $('weatherbox').classList.add('hidden');
        }
      },
      // getting weather from a search query requires getting
      // coordinates from the query and passing them along
      // to weatherFromCoordinates
      weatherFromQuery = function(query) {
        var g = new google.maps.Geocoder(),
            address = { address: query },
            handler = function(xs) {
              if(xs.length) {
                var x = xs[0],
                    coords = {
                      lat: round(x.geometry.location.lat()),
                      lng: round(x.geometry.location.lng())
                    };

                weatherFromCoordinates(coords);
                displayLocation(x.formatted_address);
                randomCatQuery();
              }
              else invalidQueryError(query); 
            };

        g.geocode(address, handler);
      },


      randomCatQuery = function() {
        var http = new XMLHttpRequest(),
            handler = function() {
              displayCat(http.response);
            };

        http.addEventListener('load', handler);
        http.open('GET', '/cats/random');
        http.send();
      },
      
      locationFromCoordinates = function(coords) {
        var query = [coords.lat, coords.lng].join(','),
            cached = possiblyCached(query);

        if(cached && 'l' in cached) displayLocation(cached.l);
        else {
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
        $('summary').textContent = weather.currently.summary;
        $('temperature').textContent = weather.currently.temperature;
        $('feelsLike').textContent = weather.currently.apparentTemperature;
        
        skycons.add('icon', weather.currently.icon);
        skycons.play();

        $('high').textContent = weather.daily[0].temperatureMax;
        $('low').textContent = weather.daily[0].temperatureMin;

        var simpleTime = function(ts) {
          var x = new Date(ts).getHours();
          return ((x + 11) % 12 + 1) + (x < 12 ? 'AM' : 'PM');
        };

        $('lowTime').textContent = simpleTime(weather.daily[0].temperatureMinTime * 1000);
        $('highTime').textContent = simpleTime(weather.daily[0].temperatureMaxTime * 1000);

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
      },
      invalidQueryError = function(query) {
        $('badquerybox').classList.remove('hidden');
        $('badquery').textContent = query;
        $('weatherbox').classList.add('hidden');
      };

  return {
    initialize: function() {
      randomCatQuery();

      // to deal with async google maps loading
      var google = google || {};

      google.cmd = google.cmd || {};
      google.cmd.push = function(callback) {
        if(!google) {
          var dt = google ? 0 : 50,
              tick = setInterval(function() {
                if(!google) return;

                clearInterval(t);
                callback();
              }, dt);

          setTimeout(clearInterval.call(window, tick), 60*dt);
        }
        else callback();
      };
      
      (function searchSetup() {
        var searchHandler = function() {
              var query = $('query').value;
              google.cmd.push(function() {
                weatherFromQuery(query);
              });

              $('badquerybox').classList.add('hidden');
            },
            keypressHandler = function(evt) {
              if(evt.keyCode == 13) searchHandler(); 
            },
            clickHandler = searchHandler;

        $('search').addEventListener('click', clickHandler);
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
            navigator.geolocation.getCurrentPosition(
              function(posn) {
                var coords = {
                  lat: round(posn.coords.latitude),
                  lng: round(posn.coords.longitude)
                };
                
                weatherFromCoordinates(coords);
                possiblyCache('geo', coords);
                google.cmd.push(function() {
                  locationFromCoordinates(coords);
                });
              },
              function(evt) {
                console.log("geolocation failed:", evt); 
              },
              { timeout: 5000 }
            );
          }
        }
      }());
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
