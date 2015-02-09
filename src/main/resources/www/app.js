(function() {

  angular
    .module('forecats', ['ngRoute'])
      .config(function($routeProvider) {
        console.log('config');
        console.log($routeProvider.when);
      })

      .factory('weatherUtil', weatherUtil)
      .factory('catUtil', catUtil)
      .factory('geoUtil', geoUtil)

      .controller('catControl', catController)
      .controller('searchControl', searchController)
      .controller('weatherControl', weatherController)
      .controller('creditsControl', creditsController)
      
      .directive('skycon', skycon) 
      .filter('temp', tempFilter)

      .run(init);

  function coordinateControl($scope, $routeParams, $rootScope) {
    console.log($routeParams);
  }
  
  function catUtil($http, $rootScope) {
    return {
      random: function() {
        $http.get('http://logitank.net/cats/random')
          .then(function(res) {
            $rootScope.$emit('CAT_ID', res.data);
          });
      }
    };
  }

  function weatherUtil($http) {
    var weatherFromCoordinates = function(lat, lng) {
          return $http.get('http://logitank.net/weather/' + [lat,lng].join(','));
        };

    return {
      fromCoordinates: weatherFromCoordinates
    };

  }

  function geoUtil($rootScope) {
    var fromCoordinates = function(lat, lng) {

        },
        fromQuery = function(query) {
          var address = { address: query },
              handler = function(xs) {
                if(!xs.length) return;

                var lat = xs[0].geometry.location.lat(),
                    lng = xs[0].geometry.location.lng(),
                    loc = xs[0].formatted_address;

                $rootScope.$emit('COORDINATES', lat, lng);
                $rootScope.$emit('LOCATION', loc);
              };
          
          (new google.maps.Geocoder()).geocode(address, handler);
        };
      
    return {
      fromCoordinates: fromCoordinates,
      fromQuery: fromQuery
    };
  }

  function tempFilter() {
    return function(t, degF) {
      return (degF 
        ? t
        : Math.floor(5*(t-32)/9)
      );
    }
  }

  var skycons = new Skycons({ "color": "#312B27" });
  skycons.play();

  function skycon() {
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

  function weatherController($scope, $rootScope, $location, weatherUtil) {
    
    $scope.showHourly = true;
    $scope.time12h = true;
    $scope.degF = true;

    $rootScope.$on('COORDINATES', function(evt, lat, lng) {
      console.log(lat, lng);
      delete $scope.forecast;

      weatherUtil
        .fromCoordinates(lat, lng)
        .then(function(w) {
          $scope.forecast = w;
        });
    });
  }

  function catController($scope, $rootScope, catUtil) {
    $rootScope.$on('CAT_ID', function(evt, id) {
      $scope.catId = id;
    });

    $scope.canPlayType = (function() {
      var video = document.createElement('video');
      return (!video.canPlayType
        ? {}
        : /* codec support: */ {
          mp4: video.canPlayType('video/mp4'),
          webm: video.canPlayType('video/webm')
        }
      );
    });
  }

  function creditsController($scope, $rootScope) {
    $rootScope.$on('CAT_ID', function(evt, id) {
      $scope.imgurHref = 'http://imgur.com/' + id;
    });

    $rootScope.$on('COORDINATES', function(evt, lat, lng) {
      $scope.forecastHref = 'http://forecast.io/#f/' + [lat, lng].join(',');
    });
    
    $scope.imgurHref = 'http://imgur.com';
    $scope.forecastHref = 'http://forecast.io';
  }

  function searchController($scope, $rootScope, geoUtil) {
    $scope.query = '';
    $scope.editLoc = false;

    $rootScope.$on('LOCATION', function(evt, loc) {
      $scope.query = loc;
    });

    $scope.handleSearch = function() {
      //console.log('search for:', $scope.query);
      geoUtil.fromQuery($scope.query);
    };
  }

  function init(catUtil) {
    catUtil.random();
  }

}());
