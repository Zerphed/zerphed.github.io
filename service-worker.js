/* Firebase library v2.2.4
 *
 * DO NOT TOUCH
 */

function put() {
  console.log("Attempting to send information to Firebase through REST API");

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

  xhr.open("PUT", "https://patient-ui.firebaseio.com/rest/hello.json", false);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send();

  if (xhr.status === 200) {
    console.log("The request succeeded, response was: " + xhr.response);
  }
  else {
    console.log("The request failed, response status: " + xhr.status + " " + xhr.statusText + ".")
  }
}


/* Start of service worker
 *
 * MAY EDIT
 */

'use strict';

self.addEventListener('push', function(event) {
  console.log('Received a push message', event);

  put();

  var title = 'Push message received.';
  var body = 'We have received a push message.';
  var icon = '/img/icon-192x192.png';
  var tag = 'simple-push-demo-notification-tag';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: icon,
      tag: tag
    })
  );
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
