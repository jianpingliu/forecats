(function() {
  angular
    .module('forecats', [])
    .config(function($sceDelegateProvider) {
      // whitelist i.imgur.com to use ng-src for videos
      $sceDelegateProvider.resourceUrlWhitelist([
        'self',
        'http://i.imgur.com/**'
      ]);
    })

    .constant('fcEvents', {
      // TODO: write better event names..
      updateCoordinates: 'COORDS',
      updateLocation: 'LOC',
      updateCatID: 'CAT'
    })
    .constant('features', {
      canPlayType: (function() {
        var v = document.createElement('video');
        return v.canPlayType && {
          webm: !!(v.canPlayType('video/webm')),
          mp4: !!(v.canPlayType('video/mp4'))
        };
      })(),
      geolocation: navigator && 'geolocation' in navigator, 
      storage: (function() {
        try {
          localStorage.setItem('forecats', 'forecats');
          localStorage.getItem('forecats');
          localStorage.removeItem('forecats');
        } catch(e) { return false; }
        
        return true;
      })(),
      touch: 'ontouchstart' in window || !!(navigator.msMaxTouchPoints)
    })

    .service('weatherUtil', weatherUtil)
    .service('catUtil', catUtil)
    .service('geoUtil', geoUtil)
    .service('storageUtil', storageUtil)

    .controller('catControl', catController)
    .controller('searchControl', searchController)
    .controller('weatherControl', weatherController)
    .controller('creditsControl', creditsController)

    .directive('skycon', skycon) 

    .filter('hour', hourFilter)
    .filter('temp', tempFilter)

    .run(init);


  function weatherUtil($http) {
    var weatherUtil = {
      fromCoordinates: function(lat, lng) {
        return $http
          .get('http://logitank.net/weather/' + [lat,lng].join(','))
          .then(function(res) { return res.data; })
      }
    };

    return weatherUtil;
  }
  
  function catUtil($http, $rootScope, fcEvents) {
    var catUtil = {
      random: function() {
        return $http
          .get('http://logitank.net/cats/random')
          .then(function(res) {
            $rootScope.$emit(fcEvents.updateCatID, res.data); 
          });
      }
    };

    return catUtil;
  }

  function geoUtil($rootScope, fcEvents, storageUtil) {
    var g = new google.maps.Geocoder(),
        trimCoord = function(x) { return Math.floor(x*10e5) / 10e5; },
        geoUtil = {
          fromQuery: function(query) {
            var handler = function(xs) {
                  if(!xs.length) return;

                  var lat = trimCoord(xs[0].geometry.location.lat()),
                      lng = trimCoord(xs[0].geometry.location.lng()),
                      loc = xs[0].formatted_address;

                  $rootScope.$emit(fcEvents.updateCoordinates, lat, lng);
                  $rootScope.$emit(fcEvents.updateLocation, loc);
                  storageUtil.byCoordinates(lat, lng).setLocation(loc);
                };
            
            g.geocode({ address: query }, handler);
          },
          fromCoordinates: function(lat, lng) {
            if(l = storageUtil.byCoordinates(lat, lng).getLocation()) {
              $rootScope.$emit(fcEvents.updateLocation, l);
            }
            else {
              var latLng = new google.maps.LatLng(lat, lng),
                  handler = function(xs) {
                    if(!xs.length) return;

                    var loc = xs[0].formatted_address;
                    $rootScope.$emit(fcEvents.updateLocation, loc);
                  };

              g.geocode({ location: latLng }, handler);
            }
          }
        };
      
    return geoUtil;
  }

  function storageUtil(features) {
    var getItem = function(storage, k) {
          if(!features.storage) return;

          try {
            var parsed = JSON.parse(storage.getItem(k));
            return parsed;
          }
          catch(e) {
            storage.removeItem(k);
            return null;
          }
        },
        setItem = function(storage, k, v) {
          if(!features.storage) return;
          
          storage.setItem(k, JSON.stringify(v));
        },
        preferences = (function() {
            var getPrefs = getItem.bind(undefined, localStorage, 'preferences'), 
                setPrefs = function(v) {
                  setItem(localStorage, 'preferences', v);
                };

            return {
              get: function(k) {
                var parsed = getPrefs() || {};
                return parsed[k];
              },
              set: function(k, v) {
                var parsed = getPrefs() || {};
                parsed[k] = v; 
                setPrefs(parsed);
              }
            };
        })(),
        byCoordinates = function(lat, lng) {
          var key = [lat, lng].join(','),
              getCoords = getItem.bind(undefined, sessionStorage, key),
              setCoords = function(v) {
                setItem(sessionStorage, key, v);
              },
              fromCoords = function(k) {
                var parsed = getCoords() || {};
                return parsed[k];
              },
              forCoords = function(k, v) {
                var parsed = getCoords() || {};
                parsed[k] = v;
                setCoords(parsed);
              };

          return {
            getWeather: fromCoords.bind(undefined, 'weather'),
            setWeather: function(v) {
              forCoords('weather', v);
            },
            getLocation: fromCoords.bind(undefined, 'location'),
            setLocation: function(v) {
              console.log('set location:', v);
              forCoords('location', v);
            }
          };

        },
        storageUtil = {
          getPreference: preferences.get,
          setPreference: preferences.set,
          byCoordinates: byCoordinates
        };

    return storageUtil;
  }

  function tempFilter() {
    return function(t, degF) {
      // convert degF to degC
      return degF ? t : Math.floor(5*(t-32)/9);
    };
  }

  function hourFilter($filter) {
    return function(ts, time12h) {
      // convert 12h to 24h
      return $filter('date')(ts, time12h ? 'h a' : 'HH:00');
    }
  }

  function skycon() {
    var skycons = new Skycons({
      color: '#231f20',
      resizeClear: true
    });
        
    skycons.play();

    return {
      restrict: 'EA',
      scope: { skycon: '=' },
      link: function(scope, elem) {
        skycons.add(elem[0], scope.skycon);

        scope.$watch('skycon', function(skycon) { 
          skycons.set(elem[0], skycon);
        });
      }
    };
  }

  function weatherController($scope, $rootScope, weatherUtil, storageUtil, fcEvents) {
    //var timePref = storageUtil.getPreference('time12h'),
    //$scope.time12h = (timePref !== null ? timePref : true);
    //$scope.toggleTime = function() { $scope.time12h = !$scope.time12h; };
    //$scope.$watch('time12h', storageUtil.setPreference.bind(undefined, 'time12h'));
    
    $scope.showHourly = true;
    $scope.time12h = true;
    
    var tempPref = storageUtil.getPreference('degF');
    $scope.degF = (tempPref !== null ? tempPref : true);
    $scope.toggleTemp = function() { $scope.degF = !$scope.degF; };
    $scope.$watch('degF', storageUtil.setPreference.bind(undefined, 'degF'));

    $rootScope.$on(fcEvents.updateCoordinates, function(evt, lat, lng) {
      delete $scope.forecast;
      
      if(w = storageUtil.byCoordinates(lat, lng).getWeather()) {
        $scope.forecast = w;
      }
      else weatherUtil
        .fromCoordinates(lat, lng)
        .then(function(w) {
          $scope.forecast = w;
          storageUtil.byCoordinates(lat, lng).setWeather(w);
        });
    });
  }

  function catController($scope, $rootScope, catUtil, fcEvents, features, $http) {
    var imgur = 'http://i.imgur.com/';
    $rootScope.$on(fcEvents.updateCatID, function(evt, id) {
      $scope.cat = {
         gif: [imgur, id, '.gif'].join(''),
         mp4: [imgur, id, '.mp4'].join(''),
        webm: [imgur, id, '.webm'].join('')
      };
      $scope.catId = id;
    });

    // force a gif fallback for mobile phones, mainly because mobile safari
    // doesn't automatically start playing our videos.
    $scope.canPlayType = !features.touch && features.canPlayType;
  }

  function creditsController($scope, $rootScope, fcEvents) {
    $rootScope.$on(fcEvents.updateCatID, function(evt, id) {
      $scope.imgurHref = 'http://imgur.com/' + id;
    });

    $rootScope.$on(fcEvents.updateCoordinates, function(evt, lat, lng) {
      $scope.forecastHref = 'http://forecast.io/#f/' + [lat, lng].join(',');
    });
    
    $scope.imgurHref = 'http://imgur.com';
    $scope.forecastHref = 'http://forecast.io';
  }

  function searchController($scope, $rootScope, geoUtil, fcEvents) {
    $scope.query = '';
    $scope.editLoc = false;

    $rootScope.$on(fcEvents.updateLocation, function(evt, loc) {
      $scope.query = loc;
    });

    $scope.handleInput = function(evt) {
      if(evt.keyCode == 13)
        $scope.handleSearch();
    };

    $scope.handleSearch = function() {
      geoUtil.fromQuery($scope.query);
    };
  }
  
  function init($location, $rootScope, $timeout, catUtil, geoUtil, fcEvents, features) {
    console.log('Forecats. http://github.com/abtrout/forecats');
    catUtil.random();
    
    // look up weather for coordinates provided in URL hash, if they exist
    if(h = $location.path().match(/^\/[0-9,.-]*/)) {
      var coords = h[0].slice(1).split(','),
          lat = coords[0],
          lng = coords[1];

      $timeout(function () {
        $rootScope.$emit(fcEvents.updateCoordinates, lat, lng);
        geoUtil.fromCoordinates(lat, lng);
      });
    }
    // otherwise try to use navigator.geolocation.getCurrentPosition
    else if(features.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function(posn) {
          var trimCoord = function(x) { return Math.floor(x*10e5) / 10e5; },
              lat = trimCoord(posn.coords.latitude),
              lng = trimCoord(posn.coords.longitude);
           
          $rootScope.$emit(fcEvents.updateCoordinates, lat, lng);        
          geoUtil.fromCoordinates(lat, lng);
        },
        function() {},
        { timeout: 5000 }
      );
    }
    
    $rootScope.$on(fcEvents.updateCoordinates, function(evt, lat, lng) {
      $location.path([lat, lng].join(','));
    });
  }
}());
