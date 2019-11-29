/*global recipeFinder _config*/

var recipeFinder = window.recipeFinder || {};

(function findScopeWrapper($) {
    var favorites;
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

    // process and display the data received from api. if the api request was successful
    function showResult(result) {
        favorites = result.recipes
        
        var recipes = favorites.Items;
        var count = favorites.Count;
        
        // if there's no favorites
        if (favorites != null && count > 0) {
            $(".recipe-div").show();
        } else {
            $(".recipe-div").hide();
            return;
        }

        console.log(recipes);
        console.log(count);

        console.log("length: ", recipes.length);

        // create html elements for display
        for (var i = 0; i < recipes.length - 1; i++) {
            var clone = document.querySelector('.recipe').cloneNode( true );
            document.querySelector('.recipe-div').appendChild( clone );
        }
        
        // set title
        $('.title').each(function(i, obj) {
            $(this).text(recipes[i].recipe.title);
        });
        // set images
        $('img').each(function(i, obj) {
            $(this).attr("src", recipes[i].recipe.base_uri + recipes[i].recipe.image);
        });
        // time
        $('.time').each(function(i, obj) {
            $(this).text("ready in " + recipes[i].recipe.readyInMinutes + " minutes");
        });
        // servings
        $('.servings').each(function(i, obj) {
            $(this).text("servings: " + recipes[i].recipe.servings);
        });

        // set recipe link
        $('.recipe-item').each(function(i, obj) {
            // var title = recipes[i].title;
            // var url;
            // var id = recipes[i].id

            // title = title.replace(new RegExp(' ', 'g'), '-');
            // url = domain + title + "-" + id;
            var str = "window.open('";
            str += recipes[i].recipe.url;
            str += "', '_blank');";
            // var url = domain + 
            $(this).attr("onclick", str);
        });
    }

    // Register click handler for #request button
    $(function onDocReady() {
        displayFavourites();

        // if (typeof favorites === "undefined")
        //     $("#recipe-section").hide();

        $('#logOut').click(function() {
            recipeFinder.logOut();
            window.location = 'signin.html';
        });

        if (!_config.api.invokeUrl) {
            $('#noApiMessage').show();
        }
    });


    function displayFavourites() {
        const userName = recipeFinder.user.getUsername();

        // make an http request to aws api gateway
        $.ajax({
            method: 'POST',
            url: _config.api.invokeUrl + '/find',
            headers: {
                Authorization: authToken
            },
            data: JSON.stringify({
                displayFavourites: true,
            }),
            contentType: 'application/json',
            success: showResult,
            error: function ajaxError(jqXHR, textStatus, errorThrown) {
                console.error('Error requesting ride: ', textStatus, ', Details: ', errorThrown);
                console.error('Response: ', jqXHR.responseText);
                alert('An error occured when requesting your unicorn:\n' + jqXHR.responseText);
            }
        });
    }

    function displayUpdate(text) {
        $('#updates').append($('<li>' + text + '</li>'));
    }
}(jQuery));
