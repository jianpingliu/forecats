(function() {

  angular.module('forecats', [])
    .factory('dataRequest', dataRequest)
    .directive('skycon', skycon) 
    .controller('catControl', catController)
    .controller('searchControl', searchController)
    .controller('weatherControl', weatherController)
    .controller('creditsControl', creditsController);

  function dataRequest($http) {
    var logError = function(rs, st, hs) {
          // TODO; log error on backend, etc
          // $http.post('/debug', {...});
          return null;
        },
        handleResponse = function(res) {
          return (res.status === 200
            ? res.data
            : logError(response, status, headers)
          );
        };

    return {
      fromUrl: function(url) {
        var prefix = 'http://logitank.net';
        return $http.get(prefix + url).then(handleResponse);
      }
    };
  }

  var skycons = new Skycons({ "color": "#231f20" });
  function skycon() {
    return {
      restrict: 'EA',
      scope: { skycon: '=' },
      link: function(scope, elem) {
        skycons.add(elem[0], Skycons.RAIN);

        scope.$watch('skycon', function(skycon) { 
          skycons.set(elem[0], skycon);
        });
      }
    };
  }

  function weatherController($scope, $rootScope, $location, dataRequest) {
    var weatherFromCoordinates = function(lat, lng) {
          dataRequest.fromUrl('/weather/' + [lat, lng].join(','))
            .then(function(forecast) {
              $scope.forecast = forecast;
              $scope.currently = forecast.currently;
            });
        };

    $rootScope.$on('COORDINATES', function(evt, lat, lng) {
      console.log('got coordinates:', lat, lng);

      $scope.forecast = null;
      weatherFromCoordinates(lat, lng);
    });

    weatherFromCoordinates(30.2672, -97.7431);
    /*
    var hash = $location.hash();
    console.log('hash:', hash);
    if(hash) {
      var ls = hash.split(',');
      console.log('extracted from hash:', ls);
      weatherFromCoordinates(ls[0], ls[1]);
    }
    */

    $scope.showHourly = true;
    $scope.toggleHourly = function() {
      $scope.showHourly = !$scope.showHourly;
    };
  }

  function catController($scope, $rootScope, dataRequest) {
    $scope.id = null;
    $rootScope.$on('CAT_ID', function(evt, id) {
      $scope.id = id;
    });

    dataRequest.fromUrl('/cats/random')
      .then(function(id) {
        //$scope.id = id;
        $rootScope.$emit('CAT_ID', id);
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

  function searchController($scope, $rootScope, $location) {

    // text displayed in the input box ...
    $scope.query = '';
    // ... which we update when we get something 'official'
    $rootScope.$on('LOCATION', function(evt, loc) {
      $scope.query = loc;
    });

    $scope.handleSearch = function() {
      console.log('search for:', $scope.query);
    };
  }

}());
