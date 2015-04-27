'use strict';

self.addEventListener('push', function(event) {
  event.waitUntil(
    console.log('Received a push message', event);

    fetch("https://patient-ui.firebaseio.com/rest/push.json").then(function(response) {

      if (response.status !=== 200) {
        console.error('Looks like there was a problem with fetch. Status code: ' + response.status);
        throw new Error();
      }

      return response.json().then(function(data) {
        if (data.error) {
          console.error('The API returned an error', data.error);
          throw new Error();
        }

        console.log("Received push message information from Firebase.");

        var title = data.title;
        var body = data.body;
        var icon = '/img/icon-192x192.png';
        var tag = 'simple-push-demo-notification-tag';

        return self.registration.showNotification(title, {
          body: body,
          icon: icon,
          tag: tag
        });
      });
  }).catch(function(err) {
    console.log('Unable to retrieve data from Firebase', err)

    var title = 'An error occurred';
    var body = 'We were unable to get information for this push message.';
    var icon = '/img/icon-192x192.png';
    var tag = 'simple-push-demo-notification-tag';

    return self.registration.showNotification(title, {
        body: body,
        icon: icon,
        tag: tag
    });
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
