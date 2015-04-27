'use strict';

var API_KEY = 'AIzaSyAKdNM4yDR738k81ex5PQzcF8Mc7SdK2yw';

var curlCommandDiv = document.querySelector('.js-curl-command');
var isPushEnabled = false;

function sendSubscriptionToServer(subscription) {
  // TODO: Send the subscription.subscriptionId and
  // subscription.endpoint to your server and save
  // it to send a push message at a later date
  console.log('TODO: Implement sendSubscriptionToServer()');
}

function showCurlCommand(subscription) {
  // The curl command to trigger a push message straight from GCM
  var subscriptionId = subscription.subscriptionId;
  var endpoint = subscription.endpoint;
  var curlCommand = 'curl --header "Authorization: key=' + API_KEY +
    '" --header Content-Type:"application/json" ' + endpoint +
    ' -d "{\\"registration_ids\\":[\\"' + subscriptionId + '\\"]}"';

  curlCommandDiv.textContent = curlCommand;
}

function unsubscribe() {
  var pushButton = document.querySelector('.js-push-button');
  pushButton.disabled = true;
  curlCommandDiv.textContent = '';

  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    // To unsubscribe from push messaging, you need get the
    // subcription object, which you can call unsubscribe() on.
    serviceWorkerRegistration.pushManager.getSubscription().then(
      function(pushSubscription) {
        // Check we have a subscription to unsubscribe
        if (!pushSubscription) {
          // No subscription object, so set the state
          // to allow the user to subscribe to push
          isPushEnabled = false;
          pushButton.disabled = false;
          pushButton.textContent = 'Enable Push Messages';
          return;
        }

        var subscriptionId = pushSubscription.subscriptionId;
        // TODO: Make a request to your server to remove
        // the subscriptionId from your data store so you
        // don't attempt to send them push messages anymore

        // We have a subcription, so call unsubscribe on it
        pushSubscription.unsubscribe().then(function(successful) {
          pushButton.disabled = false;
          pushButton.textContent = 'Enable Push Messages';
          isPushEnabled = false;
        }).catch(function(e) {
          // We failed to unsubscribe, this can lead to
          // an unusual state, so may be best to remove
          // the subscription id from your data store and
          // inform the user that you disabled push

          console.log('Unsubscription error: ', e);
          pushButton.disabled = false;
        });
      }).catch(function(e) {
        console.log('Error thrown while unsubscribing from push messaging.', e);
      });
  });
}


function subscribe() {
  // Disable the button so it can't be changed while
  // we process the permission request
  var pushButton = document.querySelector('.js-push-button');
  pushButton.disabled = true;

  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    serviceWorkerRegistration.pushManager.subscribe()
      .then(function(subscription) {
        // The subscription was successful
        isPushEnabled = true;
        pushButton.textContent = 'Disable Push Messages';
        pushButton.disabled = false;

        showCurlCommand(subscription);

        // TODO: Send the subscription.subscriptionId and
        // subscription.endpoint to your server
        // and save it to send a push message at a later date
        return sendSubscriptionToServer(subscription);
      })
      .catch(function(e) {
        if (Notification.permission === 'denied') {
          // The user denied the notification permission which
          // means we failed to subscribe and the user will need
          // to manually change the notification permission to
          // subscribe to push messages
          console.log('Permission for Notifications was denied');
          pushButton.disabled = true;
        } else {
          // A problem occurred with the subscription, this can
          // often be down to an issue or lack of the gcm_sender_id
          // and / or gcm_user_visible_only
          console.log('Unable to subscribe to push.', e);
          pushButton.disabled = false;
          pushButton.textContent = 'Enable Push Messages';
        }
      });
  });
}

window.addEventListener('load', function() {
  var pushButton = document.querySelector('.js-push-button');
  pushButton.addEventListener('click', function() {
    if (isPushEnabled) {
      unsubscribe();
    } else {
      subscribe();
      console.log('Subscribed successfully.');
    }
  });

  // Check that service workers are supported, if so, progressively
  // enhance and add push messaging support, otherwise continue without it.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
    .then(function(registration) {

       console.log('ServiceWorker registration successful with scope: ', registration.scope);

        // Are Notifications supported in the service worker?
        if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
          console.log('Notifications aren\'t supported.');
          return;
        }

        // Check the current Notification permission.
        // If its denied, it's a permanent block until the
        // user changes the permission
        if (Notification.permission === 'denied') {
          console.log('The user has blocked notifications.');
          return;
        }

        // Check if push messaging is supported
        if (!('PushManager' in window)) {
          console.log('Push messaging isn\'t supported.');
          return;
        }

        // We need the service worker registration to check for a subscription
        navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
          // Do we already have a push message subscription?
          serviceWorkerRegistration.pushManager.getSubscription()
            .then(function(subscription) {
              // Enable any UI which subscribes / unsubscribes from
              // push messages.
              var pushButton = document.querySelector('.js-push-button');
              pushButton.disabled = false;

              if (!subscription) {
                // We aren’t subscribed to push, so set UI
                // to allow the user to enable push
                return;
              }

              // Keep your server in sync with the latest subscriptionId
              sendSubscriptionToServer(subscription);

              showCurlCommand(subscription);

              // Set your UI to show they have subscribed for
              // push messages
              pushButton.textContent = 'Disable Push Messages';
              isPushEnabled = true;
            })
            .catch(function(err) {
              console.log('Error during getSubscription()', err);
            });
        });

    }).catch(function(err) {
      console.log('ServiceWorker registration failed: ', err)
    });
  } else {
    console.log('Service workers aren\'t supported in this browser.');
  }
});
