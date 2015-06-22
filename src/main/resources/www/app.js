(function Forecats() {

  angular.module('forecats', [])
    .config(imgurWhitelist)

    .service('weatherUtil', weatherUtil)
    .service('catUtil', catUtil)
    .service('geoUtil', geoUtil)
    .service('storageUtil', storageUtil)

    .controller('catControl', catController)
    .controller('feedbackControl', feedbackController)
    .controller('searchControl', searchController)
    .controller('weatherControl', weatherController)
    .controller('creditsControl', creditsController)

    .constant('fcEvents', {
      searchStart:        'SEARCH_START',
      searchFailed:       'SEARCH_FAILED',
      problem:            'PROBLEM',
      geolocationFailed:  'GEOLOCATION_FAILED',
      updateCoordinates:  'COORDS',
      updateLocation:     'LOC',
      updateCatID:        'CAT',
      weatherUpdated:     'WEATHER_UPDATED'
    })

    .constant('features', {
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
    })

    .directive('skycon', skycon)
    .filter('temp', tempFilter)
    .run(init);

  imgurWhitelist.$inject = ['$sceDelegateProvider'];
  function imgurWhitelist($sceDelegateProvider) {
    // whitelist i.imgur.com to use ng-src for videos
    $sceDelegateProvider.resourceUrlWhitelist(['self', 'https://i.imgur.com/**']);
  }

  weatherUtil.$inject = ['$http', '$rootScope', 'fcEvents'];
  function weatherUtil($http, $rootScope, fcEvents) {
    var weatherUtil = {
      fromCoordinates: function(lat, lng) {
        return $http.get('/weather/' + [lat,lng].join(','))
          .error(function() { $rootScope.$emit(fcEvents.problem); })
          .then(function(res) { return res.data; });
      }
    };

    return weatherUtil;
  }

  catUtil.$inject = ['$http', '$rootScope', 'fcEvents'];
  function catUtil($http, $rootScope, fcEvents) {
    var catUtil = {
      random: function() {
        return $http.get('/cats/random')
          .error(function() { $rootScope.$emit(fcEvents.problem); })
          .then(function(res) { $rootScope.$emit(fcEvents.updateCatID, res.data);});
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
                  if(!xs.length) {
                    $rootScope.$emit(fcEvents.searchFailed);
                    return;
                  }

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

    return {
      restrict: 'EA',
      scope: { skycon: '=' },
      link: function(scope, elem) {
        skycons.add(elem[0], scope.skycon);
        scope.$watch('skycon', function(skycon) {
          skycons.pause();
          skycons.set(elem[0], (skycon || 'clear-day'));
          skycons.play();
        });
      }
    };
  }

  weatherController.$inject = ['$scope', '$rootScope', 'weatherUtil', 'storageUtil', 'fcEvents'];
  function weatherController($scope, $rootScope, weatherUtil, storageUtil, fcEvents) {

    var tempPref = storageUtil.getPreference('degF');
    $scope.$watch('degF', storageUtil.setPreference.bind(undefined, 'degF'));
    $scope.degF = (tempPref !== undefined ? tempPref : true);
    $scope.showHourly = true;

    $rootScope.$on(fcEvents.updateCoordinates, function(evt, lat, lng) {
      $rootScope.$emit(fcEvents.searchStart);

      if(cached = storageUtil.byCoordinates(lat, lng).getWeather()) {
        $scope.forecast = cached;
        $rootScope.$emit(fcEvents.weatherUpdated);
      }
      else weatherUtil
        .fromCoordinates(lat, lng)
        .then(function(w) {
          $scope.forecast = w;
          storageUtil.byCoordinates(lat, lng).setWeather(w);
          $rootScope.$emit(fcEvents.weatherUpdated);
        });
    });

    $rootScope.$on(fcEvents.searchStart, function() {
      // hides the weather forecast.
      // after a search happens, we're committing to new data anyway
      $scope.forecast = null;
    });
  }

  catController.$inject = ['$scope', '$rootScope', 'catUtil', 'fcEvents', 'features', '$http'];
  function catController($scope, $rootScope, catUtil, fcEvents, features, $http) {
    var imgur = '//i.imgur.com/';
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

  feedbackController.$inject = ['$scope', '$rootScope', 'fcEvents', 'catUtil'];
  function feedbackController($scope, $rootScope, fcEvents, catUtil) {

    $scope.errorMsg = false;
    $scope.activeSearch = false;
    $scope.failedSearch = false;
    $scope.failedGeolocation = false;

    // Feedback is cleared when we start a new search or when weather is updated
    $rootScope.$on(fcEvents.weatherUpdated, clearFeedback); 

    $rootScope.$on(fcEvents.searchStart, function() {
      clearFeedback();
      $scope.activeSearch = true;
    });

    // The following two events are triggered by vanilla javascript
    // events, so need to be wrapped in $scope.$apply for binding updates
    $rootScope.$on(fcEvents.geolocationFailed, function() {
      $scope.$apply(function() {
        clearFeedback();
        $scope.failedGeolocation = true;
      });
    });

    $rootScope.$on(fcEvents.searchFailed, function() { 
      $scope.$apply(function() {
        clearFeedback();
        $scope.failedSearch = true;
      });
    });

    $rootScope.$on(fcEvents.problem, function() { 
      clearFeedback();
      $scope.errorMsg = true;
    });

    function clearFeedback() {
      $scope.errorMsg = false;
      $scope.activeSearch = false;
      $scope.failedSearch = false;
      $scope.failedGeolocation = false;
    }
  }

  creditsController.$inject = ['$scope', '$rootScope', 'fcEvents'];
  function creditsController($scope, $rootScope, fcEvents) {
    $scope.imgurHref = '//imgur.com';
    $rootScope.$on(fcEvents.updateCatID, function(evt, id) {
      $scope.imgurHref = '//imgur.com/' + id;
    });

    $scope.forecastHref = '//forecast.io';
    $rootScope.$on(fcEvents.updateCoordinates, function(evt, lat, lng) {
      $scope.forecastHref = '//forecast.io/#f/' + [lat, lng].join(',');
    });
  }

  searchController.$inject = ['$scope', '$rootScope', 'catUtil', 'geoUtil', 'fcEvents'];
  function searchController($scope, $rootScope, catUtil, geoUtil, fcEvents) {
    $scope.query = '';

    $rootScope.$on(fcEvents.updateLocation, function(evt, loc) {
      $scope.$apply(function() { $scope.query = loc; });
    });

    $scope.handleSearch = function() {
      $rootScope.$emit(fcEvents.searchStart);
      geoUtil.fromQuery($scope.query);
    };

    $scope.handleInput = function(evt) {
      if(evt.keyCode == 13) $scope.handleSearch();
    };
  }

  init.$inject = ['$location', '$rootScope', '$timeout', 'catUtil', 'geoUtil', 'fcEvents', 'features'];
  function init($location, $rootScope, $timeout, catUtil, geoUtil, fcEvents, features) {

    if(hash = $location.path().match(/^\/[0-9,.-]*/)) {
      var coords = hash[0].slice(1).split(','),
          lat = coords[0],
          lng = coords[1];

      $timeout(function () {
        $rootScope.$emit(fcEvents.updateCoordinates, lat, lng);
        geoUtil.fromCoordinates(lat, lng);
      });
    }
    else if(features.geolocation) {
      var success = function(posn) {
            var lat = geoUtil.trimCoord(posn.coords.latitude),
                lng = geoUtil.trimCoord(posn.coords.longitude);

            $rootScope.$emit(fcEvents.updateCoordinates, lat, lng);
            geoUtil.fromCoordinates(lat, lng);
          },
          failure = function(err) {
            $rootScope.$emit(fcEvents.geolocationFailed);
            document.getElementById('search').focus();
          },
          options = { timeout: 3000 };

      // wrap geolocation in setTimeout to avoid safari bug
      // see: http://stackoverflow.com/questions/27150465/geolocation-api-in-safari-8-and-7-1-keeps-asking-permission
      setTimeout(function() {
        $rootScope.$emit(fcEvents.searchStart);
        navigator.geolocation.getCurrentPosition(success, failure, options);
      }, 50);
    }

    $rootScope.$on(fcEvents.updateCoordinates, function(evt, lat, lng) {
      $location.path([geoUtil.trimCoord(lat), geoUtil.trimCoord(lng)].join(','));
    });

    catUtil.random();
  }
}());
