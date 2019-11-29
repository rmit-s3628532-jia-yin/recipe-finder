/*global recipeFinder _config*/

var recipeFinder = window.recipeFinder || {};

(function findScopeWrapper($) {
    var authToken;
    recipeFinder.authToken.then(function setAuthToken(token) {
        if (token) {
            authToken = token;
        } else {
            window.location.href = 'signin.html';
        }
    }).catch(function handleTokenError(error) {
        alert(error);
        window.location.href = 'signin.html';
    });

    function finishAddingFavourites(result) {
        console.log(result);
    }

    // process and display the data received from api. if the api request was successful
    function completeRequest(result) {
        // show the div once result is available
        $("#recipe-section").show();

        var data;
        var recipes;

        data = JSON.parse(result.Recipes);
        var number_of_recipes = data.number;
        const base_uri = data.baseUri;
        const externel_urls = result.urls;
        recipes = data.results;
        const domain = "https://spoonacular.com/"; 

        console.log('recipes');
        console.log(recipes);
        console.log('urls');
        console.log(externel_urls);
        
        // set title
        $('.title').each(function(i, obj) {
            $(this).text(recipes[i].title);
        });
        // set images
        $('img').each(function(i, obj) {
            $(this).attr("src", base_uri + recipes[i].image);
        });
        // time
        $('.time').each(function(i, obj) {
            $(this).text("ready in " + recipes[i].readyInMinutes + " minutes");
        });
        // servings
        $('.servings').each(function(i, obj) {
            $(this).text("servings: " + recipes[i].servings);
        });

        // set recipe link
        $('.recipe-item').each(function(i, obj) {
            // var title = recipes[i].title;
            // var url;
            // var id = recipes[i].id

            // title = title.replace(new RegExp(' ', 'g'), '-');
            // url = domain + title + "-" + id;
            var str = "window.open('";
            str += externel_urls[i];
            str += "', '_blank');";
            // var url = domain + 
            $(this).attr("onclick", str);
        });

        // add favourite links
        $('.favourites').each(function(i, obj) {
            $(this).click(function(e) {
                e.stopPropagation();
                console.log(i);
                var recipe = recipes[i];
                recipe.base_uri = base_uri;
                recipe.url = externel_urls[i];
                console.log(recipe);

                // make an http request to aws api gateway
                $.ajax({
                    method: 'POST',
                    url: _config.api.invokeUrl + '/find',
                    headers: {
                        Authorization: authToken
                    },
                    data: JSON.stringify({
                        addToFavourites: true, 
                        recipe: recipe
                    }),
                    contentType: 'application/json',
                    success: finishAddingFavourites,
                    error: function ajaxError(jqXHR, textStatus, errorThrown) {
                        console.error('Error finding recipes: ', textStatus, ', Details: ', errorThrown);
                        console.error('Response: ', jqXHR.responseText);
                        alert('An error occured when finding your recipes:\n' + jqXHR.responseText);
                    }
                });
             });
        });
    }

    // Register click handler for #request button
    $(function onDocReady() {

        console.log(recipeFinder.authToken);
        $('#searchForm').submit(findRecipe);
        $('#logOut').click(function() {
            recipeFinder.logOut();
            window.location = 'signin.html';
        });

        $("#recipe-section").hide();

        // recipeFinder.authToken.then(function updateAuthMessage(token) {
        //     if (token) {
        //         displayUpdate('You are authenticated. Click to see your <a href="#authTokenModal" data-toggle="modal">auth token</a>.');
        //         $('.authToken').text(token);
        //     }
        // });

        // if (!_config.api.invokeUrl) {
        //     $('#noApiMessage').show();
        // }
    });

    function findRecipe(event) {
        event.preventDefault();

        // extract ingredients from user input string
        var data = $("#searchForm :input").serializeArray();
        const ingredients = data[0].value;
        console.log(ingredients);

        // make an http request to aws api gateway
        $.ajax({
            method: 'POST',
            url: _config.api.invokeUrl + '/find',
            headers: {
                Authorization: authToken
            },
            data: JSON.stringify({
                ingredients: ingredients
            }),
            contentType: 'application/json',
            success: completeRequest,
            error: function ajaxError(jqXHR, textStatus, errorThrown) {
                console.error('Error finding recipes: ', textStatus, ', Details: ', errorThrown);
                console.error('Response: ', jqXHR.responseText);
                alert('An error occured when finding your recipes:\n' + jqXHR.responseText);
            }
        });
    }
}(jQuery));
