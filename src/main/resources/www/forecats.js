
var features = {
      canPlayType: true,
      sessionStorage: true,
      localStorage: true,
      gelocation: true
    },
    forecats = angular.module('forecats', []);

forecats.constant('events', {
});

forecats.controller('catControl', function($scope) {
  function setCatId(evt, id) {
    $scope.id = id;
  };

  $scope.id = null;
  $scope.fallback = features.canPlayType;
});

forecats.controller('locationControl', function($scope) {
  var locationFromQuery = function(query) {
        console.log('getting location from query:', query); 
      },
      locationFromCoordinates = function(lat, lng) {
        console.log('getting location from coords:', lat, lng);
      };
  
  $scope.query = null;
  $scope.search = function() {
    if($scope.query) locationFromQuery($scope.query);
  };
});

forecats.controller('weatherControl', function($scope) {
  
  $scope.forecast = null;
});

forecats.controller('creditsControl', function($scope) {
});
