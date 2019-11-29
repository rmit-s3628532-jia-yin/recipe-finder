/*global recipeFinder _config AmazonCognitoIdentity AWSCognito*/

var recipeFinder = window.recipeFinder || {};

(function scopeWrapper($) {

    // get the pool id and client app ID
    var poolData = {
        UserPoolId: _config.cognito.userPoolId,
        ClientId: _config.cognito.userPoolClientId
    };

    var userPool;

    // return an error when the config file is incomplete
    if (!(_config.cognito.userPoolId &&
          _config.cognito.userPoolClientId &&
          _config.cognito.region)) {
        alert("config not complete");
        return;
    }

    userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    if (typeof AWSCognito !== 'undefined') {
        AWSCognito.config.region = _config.cognito.region;
    }

    recipeFinder.authToken = new Promise(function fetchCurrentAuthToken(resolve, reject) {
        var cognitoUser = userPool.getCurrentUser();
        recipeFinder.user = cognitoUser;

        if (cognitoUser) {
            cognitoUser.getSession(function sessionCallback(err, session) {
                if (err) {
                    reject(err);
                } else if (!session.isValid()) {
                    resolve(null);
                } else {
                    resolve(session.getIdToken().getJwtToken());
                }
            });
        } else {
            resolve(null);
        }
    });

    // register the user into the user pool
    function register(email, password, onSuccess, onFailure) {
        var dataEmail = {
            Name: 'email',
            Value: email
        };
        var attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);

        userPool.signUp(email, password, [attributeEmail], null,
            function signUpCallback(err, result) {
                if (!err) {
                    onSuccess(result);
                } else {
                    onFailure(err);
                }
            }
        );
    }

    // log in user if there is matching record in the user pool
    function login(email, password, onSuccess, onFailure) {
        var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
            Username: email,
            Password: password
        });
        // create the user based on the email provided
        var cognitoUser = createCognitoUser(email);

        // compare the provided password to the password in the user pool
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: onSuccess,
            onFailure: onFailure
        });
    }

    function createCognitoUser(email) {
        return new AmazonCognitoIdentity.CognitoUser({
            Username: email,
            Pool: userPool
        });
    }

    recipeFinder.logOut = function logOut() {
        userPool.getCurrentUser().signOut();
    };

    $(function onDocReady() {
        $('#loginForm').submit(handleLogin);
        $('#registrationForm').submit(handleRegister);
    });

    function handleLogin(event) {
        var email = $('#emailLogin').val();
        var password = $('#passwordLogin').val();
        event.preventDefault();
        login(email, password,
            function loginSuccess() {
                console.log('Successfully Logged In');
                window.location.href = 'byingredients.html';
            },
            function loginError(err) {
                alert(err);
            }
        );
    }

    function handleRegister(event) {
        var email = $('#emailRegister').val();
        var password = $('#passwordRegister').val();
        var password2 = $('#password2Register').val();

        var onSuccess = function registerSuccess(result) {
            var cognitoUser = result.user;
            console.log('user name: ' + cognitoUser.getUsername());
            
            window.location.href = 'signin.html';
        };
        var onFailure = function registerFailure(err) {
            alert(err);
        };
        event.preventDefault();

        if (password === password2) {
            register(email, password, onSuccess, onFailure);
        } else {
            alert('passwords do not match');
        }
    }
}(jQuery));
