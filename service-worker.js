/* Firebase library v2.2.4
 *
 * DO NOT TOUCH
 */

function put() {
  console.log("Attempting to PUT information to Firebase through REST API");

  var xhr = new XMLHttpRequest();

  var data = {
    title: "Hello World!",
    author: "Firebase",
    location: {
      city: "San Francisco",
      state: "California",
      zip: 94103
    }
  };

  xhr.open("PUT", "https://patient-ui.firebaseio.com/rest/hello.json", true);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send();

  if (xhr.status === 200) {
    console.log("The request succeeded, response was: " + xhr.response);
  }
  else {
    console.log("The request failed, response status: " + xhr.status + " " + xhr.statusText + ".")
  }
}


function get(url) {
  // Return a new promise.
  return new Promise(function(resolve, reject) {
    // Do the usual XHR stuff
    var req = new XMLHttpRequest();
    req.open('GET', url);

    req.onload = function() {
      // This is called even on 404 etc
      // so check the status
      if (req.status == 200) {
        // Resolve the promise with the response text
        resolve(req.response);
      }
      else {
        // Otherwise reject with the status text
        // which will hopefully be a meaningful error
        reject(Error(req.statusText));
      }
    };

    // Handle network errors
    req.onerror = function() {
      reject(Error("Network Error"));
    };

    // Make the request
    req.send();
  });
}


/* Start of service worker
 *
 * MAY EDIT
 */

'use strict';

self.addEventListener('push', function(event) {
  console.log('Received a push message', event);

  get("https://patient-ui.firebaseio.com/rest/push.json").then(function(response) {
    console.log("Received push message information from Firebase.", response);

    var jsonResponse = JSON.parse(response);

    var title = jsonResponse.title;
    var body = jsonResponse.body;
    var icon = '/img/icon-192x192.png';
    var tag = 'simple-push-demo-notification-tag';

    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: icon,
        tag: tag
      })
    );

  }, function(error) {
    console.error("Failed to receive push message information from Firebase.", error)
  });
});


self.addEventListener('notificationclick', function(event) {
  console.log('On notification click: ', event.notification.tag);
  // Android doesn’t close the notification when you click on it
  // See: http://crbug.com/463146
  event.notification.close();

  // This looks to see if the current is already open and
  // focuses if it is
  event.waitUntil(clients.matchAll({
    type: "window"
  }).then(function(clientList) {
    for (var i = 0; i < clientList.length; i++) {
      var client = clientList[i];
      if (client.url == '/' && 'focus' in client)
        return client.focus();
    }
    if (clients.openWindow)
      return clients.openWindow('/');
  }));

});
