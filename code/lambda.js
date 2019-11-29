const AWS = require('aws-sdk');
const request = require("request");

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
    if (!event.requestContext.authorizer) {
      errorResponse('Authorization not configured', context.awsRequestId, callback);
      return;
    }

    console.log('Received event: ', event);

    const requestBody = JSON.parse(event.body);
    const displayFavourites = requestBody.displayFavourites;
    const addToFavourites = requestBody.addToFavourites;

    console.log("add to favourites?????");
    console.log(addToFavourites);

    console.log("display favourites?????");
    console.log(displayFavourites);

    // request to add a recipe to favourites
    if (addToFavourites) {
      console.log("addinggggggggg");
      const username = event.requestContext.authorizer.claims['cognito:username'];
      const recipe = requestBody.recipe;

      recordRecipe(username, recipe).then(() => {
        // You can use the callback function to provide a return value from your Node.js
        // Lambda functions. The first parameter is used for failed invocations. The
        // second parameter specifies the result data of the invocation.

        // Because this Lambda function is called by an API Gateway proxy integration
        // the result object must use the following structure.
        console.log("recipe: ", recipe);
        callback(null, {
            statusCode: 201,
            body: JSON.stringify({
                recipe: recipe,
                User: username,
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
        });
        return;
      }).catch((err) => {
          console.error(err);

          // If there is an error during processing, catch it and return
          // from the Lambda function successfully. Specify a 500 HTTP status
          // code and provide an error message in the body. This will provide a
          // more meaningful error response to the end client.
          errorResponse(err.message, context.awsRequestId, callback)
      });
    }

    // if the request is to display favourite recipes
    else if (displayFavourites) {

      const userName = event.requestContext.authorizer.claims['cognito:username'];
      var params = {
        TableName : "RecipeFinder",
        KeyConditionExpression: "#userName = :u",
        ExpressionAttributeNames:{
            "#userName": "UserName"
        },
        ExpressionAttributeValues: {
            ":u": userName
        }
      };
      ddb.query(params, function(err, data) {
        if (err) {
            console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            callback(null, {
              statusCode: 201,
              body: JSON.stringify({
                  recipes: data,
              }),
              headers: {
                  'Access-Control-Allow-Origin': '*',
              },
            });
            return;
        }
      });
    }

    // find recipe request
    else {
      const ingredients = requestBody.ingredients;
      console.log("ingredients: ", ingredients);

      var recipes = {};

      var options = {
        method: 'GET',
        url: 'https://api.spoonacular.com/recipes/search',
        qs: {
              query: ingredients,
              number: '10',
              apiKey: '9041c38468e94735a44f8146e6d8ca69'
            },
        headers: {
          'Content-Type': 'application/json',
        }
      };

      request(options, function (error, response, body) {
        if (error) 
          throw new Error(error);

        else {
          recipes = body;
          const username = event.requestContext.authorizer.claims['cognito:username'];

          // get the ids from the recipes in the api response
          var ids = "";
          var recipes_by_ingredients = JSON.parse(body);
          recipes_by_ingredients = recipes_by_ingredients.results;

          recipes_by_ingredients.forEach(function (item, index) {
            
            if (index == 0) {
              ids += item.id;
            }
            else {
              ids += "," + item.id;
            }
          });

          console.log("get ids");
          console.log(ids);

          // another api call: get recipe information
          const options2 = {
            method: 'GET',
            url: 'https://api.spoonacular.com/recipes/informationBulk',
            qs: {
                  ids: ids,
                  apiKey: '9041c38468e94735a44f8146e6d8ca69'
                },
            headers: {
              'Content-Type': 'application/json',
            }
          };

          request(options2, function (error, response, body2) {
            if (error) throw new Error(error);
            
            

            // get the URLs from the result
            var urls = [];

            var recipe_information = JSON.parse(body2);
            // console.log("recipe information!!!!!!!!!!");
            // console.log(recipe_information);

            recipe_information.forEach(function (item, index) {
              urls.push(item.sourceUrl);
            });

            console.log(urls);

            callback(null, {
              statusCode: 201,
              body: JSON.stringify({
                  Recipes: body,
                  urls: urls,
                  User: username,
              }),
              headers: {
                  'Access-Control-Allow-Origin': '*',
              },
            });
        });

        // The body field of the event in a proxy integration is a raw string.
        // In order to extract meaningful values, we need to first parse this string
        // into an object. A more robust implementation might inspect the Content-Type
        // header first and use a different parsing strategy based on that value.
        
      //   recordRecipe(username, recipes).then(() => {
      //     // You can use the callback function to provide a return value from your Node.js
      //     // Lambda functions. The first parameter is used for failed invocations. The
      //     // second parameter specifies the result data of the invocation.

      //     // Because this Lambda function is called by an API Gateway proxy integration
      //     // the result object must use the following structure.
      //     console.log("recipes: ", recipes);
      //     callback(null, {
      //         statusCode: 201,
      //         body: JSON.stringify({
      //             Recipes: recipes,
      //             User: username,
      //         }),
      //         headers: {
      //             'Access-Control-Allow-Origin': '*',
      //         },
      //     });
      // }).catch((err) => {
      //     console.error(err);

      //     // If there is an error during processing, catch it and return
      //     // from the Lambda function successfully. Specify a 500 HTTP status
      //     // code and provide an error message in the body. This will provide a
      //     // more meaningful error response to the end client.
      //     errorResponse(err.message, context.awsRequestId, callback)
      // });
      }
    });
    }
};

function recordRecipe(username, recipe) {
    return ddb.put({
        TableName: 'RecipeFinder',
        Item: {
            UserName: username,
            RecipeID: recipe.id,
            recipe: recipe
        },
    }).promise();
}

function errorResponse(errorMessage, awsRequestId, callback) {
  callback(null, {
    statusCode: 500,
    body: JSON.stringify({
      Error: errorMessage,
      Reference: awsRequestId,
    }),
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  });
}
