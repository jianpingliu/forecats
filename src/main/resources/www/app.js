(function Forecats() {

  var features = {
        canPlayType: (function() {
          var v = document.createElement('video');
          return {
            webm: v.canPlayType && !!(v.canPlayType('video/webm')),
            mp4: v.canPlayType && !!(v.canPlayType('video/mp4'))
          };
        }()),
        geolocation: navigator && 'geolocation' in navigator,
        storage: (function() {
          try {
            localStorage.setItem('forecats', 'forecats');
            localStorage.removeItem('forecats');
            return true;
          } catch(e) { return false; }
        })(),
        touch: 'ontouchstart' in window || !!(navigator.msMaxTouchPoints)
      },
      fcEvents = {
        updateCoordinates: 'COORDS',
        updateLocation: 'LOC',
        updateCatID: 'CAT'
      };

  angular.module('forecats', [])

    .config(imgurWhitelist)
    .constant('fcEvents', fcEvents)
    .constant('features', features)

    .service('weatherUtil', weatherUtil)
    .service('catUtil', catUtil)
    .service('geoUtil', geoUtil)
    .service('storageUtil', storageUtil)

    .controller('catControl', catController)
    .controller('searchControl', searchController)
    .controller('weatherControl', weatherController)
    .controller('creditsControl', creditsController)

    .directive('skycon', skycon)
    .filter('temp', tempFilter)
    .run(init);


  imgurWhitelist.$inject = ['$sceDelegateProvider'];
  function imgurWhitelist($sceDelegateProvider) {
    // whitelist i.imgur.com to use ng-src for videos
    $sceDelegateProvider.resourceUrlWhitelist(['self', 'http://i.imgur.com/**']);
  }

  weatherUtil.$inject = ['$http'];
  function weatherUtil($http) {
    var weatherUtil = {
      fromCoordinates: function(lat, lng) {
        return $http.get('http://logitank.net/weather/' + [lat,lng].join(','))
          .then(function(res) { return res.data; })
      }
    };

    return weatherUtil;
  }

  catUtil.$inject = ['$http', '$rootScope', 'fcEvents'];
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

  geoUtil.$inject = ['$rootScope', 'fcEvents', 'storageUtil'];
  function geoUtil($rootScope, fcEvents, storageUtil) {
    var g = new google.maps.Geocoder(),
        trimCoord = function(x) { return Math.floor(x*10e5) / 10e5; },
        geoUtil = {
          trimCoord: trimCoord,
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

  storageUtil.$inject = ['features'];
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
                setPrefs = setItem.bind(undefined, localStorage, 'preferences');

            return {
              get: function(k) {
                var parsed = getPrefs() || {};
                return parsed[k] || null;
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
              setCoords = setItem.bind(undefined, sessionStorage, key),
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
            setWeather: forCoords.bind(undefined, 'weather'),
            getLocation: fromCoords.bind(undefined, 'location'),
            setLocation: forCoords.bind(undefined, 'location')
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
      return degF ? t : Math.floor(5*(t-32)/9);
    };
  }


  function skycon() {
    var skycons = new Skycons({ color: '#312B27', resizeClear: true });
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

  weatherController.$inject = ['$scope', '$rootScope', 'weatherUtil', 'storageUtil', 'fcEvents'];
  function weatherController($scope, $rootScope, weatherUtil, storageUtil, fcEvents) {
    $scope.showHourly = true;

    var tempPref = storageUtil.getPreference('degF');
    $scope.degF = (tempPref !== null ? tempPref : true);
    $scope.$watch('degF', storageUtil.setPreference.bind(undefined, 'degF'));

    $rootScope.$on(fcEvents.updateCoordinates, function(evt, lat, lng) {
      if(cached = storageUtil.byCoordinates(lat, lng).getWeather())
        $scope.forecast = cached;
      else weatherUtil
        .fromCoordinates(lat, lng)
        .then(function(w) {
          $scope.forecast = w;
          storageUtil.byCoordinates(lat, lng).setWeather(w);
        });
    });
  }

  catController.$inject = ['$scope', '$rootScope', 'catUtil', 'fcEvents', 'features', '$http'];
  function catController($scope, $rootScope, catUtil, fcEvents, features, $http) {
    var imgur = 'http://i.imgur.com/';
    // HACK: force a gif fallback for mobile phones, mainly because mobile safari
    // doesn't automatically start playing our videos. would love a workaround.
    $scope.canPlayType = !features.touch && features.canPlayType;

    $rootScope.$on(fcEvents.updateCatID, function(evt, id) {
      $scope.catId = id;
      $scope.cat = {
         gif: [imgur, id, '.gif'].join(''),
         mp4: [imgur, id, '.mp4'].join(''),
        webm: [imgur, id, '.webm'].join('')
      };
    });
  }

  creditsController.$inject = ['$scope', '$rootScope', 'fcEvents'];
  function creditsController($scope, $rootScope, fcEvents) {
    $scope.imgurHref = 'http://imgur.com';
    $rootScope.$on(fcEvents.updateCatID, function(evt, id) {
      $scope.imgurHref = 'http://imgur.com/' + id;
    });

    $scope.forecastHref = 'http://forecast.io';
    $rootScope.$on(fcEvents.updateCoordinates, function(evt, lat, lng) {
      $scope.forecastHref = 'http://forecast.io/#f/' + [lat, lng].join(',');
    });
  }

  searchController.$inject = ['$scope', '$rootScope', 'geoUtil', 'fcEvents'];
  function searchController($scope, $rootScope, geoUtil, fcEvents) {
    $scope.query = '';
    $rootScope.$on(fcEvents.updateLocation, function(evt, loc) {
      $scope.$apply(function() {
        $scope.query = loc;
      });
    });

    $scope.handleSearch = function() {
      geoUtil.fromQuery($scope.query);
    };

    $scope.handleInput = function(evt) {
      if(evt.keyCode == 13) $scope.handleSearch();
    };
  }


  init.$inject = ['$location', '$rootScope', '$timeout', 'catUtil', 'geoUtil', 'fcEvents', 'features'];
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
      var success = function(posn) {
            var lat = geoUtil.trimCoord(posn.coords.latitude),
                lng = geoUtil.trimCoord(posn.coords.longitude);

            $rootScope.$emit(fcEvents.updateCoordinates, lat, lng);
            geoUtil.fromCoordinates(lat, lng);
          },
          failure = function(err) {
            document.getElementById('search').focus();
          },
          options = { timeout: 5000 };

      // wrap geolocation in setTimeout to avoid safari bug
      // see: http://stackoverflow.com/questions/27150465/geolocation-api-in-safari-8-and-7-1-keeps-asking-permission
      setTimeout(function() {
        navigator.geolocation.getCurrentPosition(success, failure, options);
      }, 50);
    }

    $rootScope.$on(fcEvents.updateCoordinates, function(evt, lat, lng) {
      $location.path([geoUtil.trimCoord(lat), geoUtil.trimCoord(lng)].join(','));
    });
  }
}());
