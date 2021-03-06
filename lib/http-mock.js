'use strict';

function mockTemplate() {
	var queryStringParse = '<place_query_string_parse_here>';
	var expectations = '<place_content_here>';

	var newModule = angular.module('httpMock', []);

	newModule.requests = [];

	newModule.config(['$provide', function($provide){
		$provide.decorator('$http', ['$delegate', '$q', function($http, $q) {
			function endsWith(url, path){
				return url.indexOf(path, url.length - path.length) !== -1;
			}

			function matchQueryString(expectationParams, url){
				var match = false;

				if(url.indexOf('?') > -1){
					var configParams = queryStringParse(url);
					match = objectMatch(expectationParams, configParams);
				}

				return match;
			}

			function match(config, expectationRequest){
				var pathMatch = expectationRequest.path instanceof RegExp ?
						config.url.match(expectationRequest.path) :
						endsWith(config.url, expectationRequest.path);

				return	expectationRequest.method === config.method &&
						pathMatch &&
						(angular.equals(expectationRequest.params, config.params)) &&
						(angular.equals(expectationRequest.data, config.data));
			}

			function matchExpectation(config){
				var expectation;

				for(var i = 0; i < expectations.length; i++){
					if(match(config, expectations[i].request)){
						expectation = expectations[i];
					}
				}

				return expectation;
			}
			
			function wrapWithSuccessError(promise) {
				var myPromise = promise;
				
				myPromise.success = function(callback) {
					myPromise.then(function(response) {
						callback(response.data, response.status, response.headers, response.config);
					});
					return myPromise;
				};

				myPromise.error = function(callback) {
					myPromise.then(null, function(response) {
						callback(response.data, response.status, response.headers, response.config);
					});
					return myPromise;
				};

				return myPromise;
			}

			function statusIsSuccessful(status){
				return status >= 200 && status <= 299;
			}

			function httpMock(config){
				
				var prom;
				var expectation = matchExpectation(config);

				if(expectation){
					var deferred = $q.defer();

					newModule.requests.push(config);

					setTimeout(function(){
						expectation.response = expectation.response || {};
						
						var response = {
							data: expectation.response.data || {},
							config: config,
							headers: function(){}
						};

						response.status = expectation.response.status || 200;

						if(statusIsSuccessful(response.status)){
							deferred.resolve(response);
						}else{
							deferred.reject(response);
						}

					}, 0);

					prom = wrapWithSuccessError(deferred.promise);
				}else{
					prom = $http(config);
				}

				return prom;
			}

			httpMock.get = function(url, config){
				config = config || {};
				config.url = url;
				config.method = 'GET';

				return httpMock(config);
			};

			httpMock.delete = function(url, config){
				config = config || {};
				config.url = url;
				config.method = 'DELETE';

				return httpMock(config);
			};

			httpMock.head = function(url, config){
				config = config || {};
				config.url = url;
				config.method = 'HEAD';

				return httpMock(config);
			};

			httpMock.jsonp = function(url, config){
				config = config || {};
				config.url = url;
				config.method = 'JSONP';

				return httpMock(config);
			};

			httpMock.post = function(url, data, config){
				config = config || {};
				config.url = url;
				config.data = data;
				config.method = 'POST';

				return httpMock(config);
			};

			httpMock.put = function(url, data, config){
				config = config || {};
				config.url = url;
				config.data = data;
				config.method = 'PUT';

				return httpMock(config);
			};

			httpMock.patch = function(url, data, config){
				config = config || {};
				config.url = url;
				config.data = data;
				config.method = 'PATCH';

				return httpMock(config);
			};

			httpMock.defaults = $http.defaults;
			
			return httpMock;
		}]);
	}]);
	
	newModule.clearRequests = function(){
		newModule.requests = [];
	};

	return newModule;
}

function getExpectationsString(expectations){
	var printExpectations = [];

	for(var i=0; i< expectations.length; i++){
		printExpectations.push(JSON.stringify(expectations[i]));
	}

	return printExpectations.toString();
}

module.exports = function(expectations, queryString){
	var templateString = mockTemplate.toString();
	var template = templateString.substring(templateString.indexOf('{') + 1, templateString.lastIndexOf('}'));
	var newFunc = template.replace(/'<place_content_here>'/, '[' + getExpectationsString(expectations) + ']');
	newFunc = newFunc.replace(/'<place_query_string_parse_here>'/, queryString.parse.toString());

	/*jslint evil: true */
	return new Function(newFunc);
};
