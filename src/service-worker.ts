
/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */
import IndexDbManager from "./lib/indexdb-manager";
import { PrecacheEntry } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope;

const VERSION = "v5";

// Create a base cache on Install
self.addEventListener("install", (event: ExtendableEvent) => {
  console.log(`${VERSION} installing…`);

  const fileList = self.__WB_MANIFEST as PrecacheEntry[];

  const addResourcesToCache = async (resources: PrecacheEntry[]) => {
    const cache = await caches.open(VERSION);
    await cache.addAll(resources.map((r) => r.url));
  };

  self.skipWaiting();

  event.waitUntil(addResourcesToCache(fileList));
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  const deleteOld = async () => {
    const cacheNames = await caches.keys();

    await Promise.all(cacheNames.filter((item) => item !== VERSION).map((item) => caches.delete(item)));
  };

  // Delete all old caches after taking control
  event.waitUntil(deleteOld());

  console.log(`${VERSION} activated...`);
});

self.addEventListener("fetch", (event: FetchEvent) => {
  const storeInCache = async (request: Request, response: Response) => {
    const cache = await caches.open(VERSION);

    if (request.method === "POST") {
      console.log("Cannot cache POST requests");
      return;
    }

    if (!request.url.includes(process.env.PUBLIC_URL)) {
      console.log("Cannot cache 3rd party requests");
      return;
    }

    await cache.put(request, response);
  };

  const cacheFirst = async (request: Request) => {
    // First, Service Worker will retrieve the asset from the cache
    const responseFromCache = await caches.match(request);
    if (responseFromCache) {
      return responseFromCache;
    }

    // If not present in the cache it will call the APIs
    const responseFromNetwork = await fetch(request);

    // Then store them in the cache
    storeInCache(request, responseFromNetwork.clone());
    return responseFromNetwork;
  };

  event.respondWith(cacheFirst(event.request));
});

self.addEventListener("message", (event) => {});

self.addEventListener("sync", function (event) {
  if (event.tag === "expense-sync") {
    const channelE = new BroadcastChannel("indexdb-expenses");

    IndexDbManager.getFromStore().then((expenses) => {
      channelE.postMessage(expenses);
    });

    const channelC = new BroadcastChannel("indexdb-categories");

    IndexDbManager.getFromStore(IndexDbManager.catStoreName).then((categories) => {
      channelC.postMessage(categories);
    });
  }
});

declare const firebase: any;

// Scripts for firebase and firebase messaging
importScripts("https://www.gstatic.com/firebasejs/8.2.0/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.2.0/firebase-messaging.js");

// Initialize the Firebase app in the service worker by passing the generated config
const firebaseConfig = {
  apiKey: "AIzaSyDJG4c1mt-WEYRpm2ubKE856OWr-_KXGkM",
  authDomain: "expenseapp-fanshawe.firebaseapp.com",
  projectId: "expenseapp-fanshawe",
  storageBucket: "expenseapp-fanshawe.appspot.com",
  messagingSenderId: "726413986466",
  appId: "1:726413986466:web:1afee192df9a13030765fb",
};

firebase.initializeApp(firebaseConfig);

// Retrieve firebase messaging
const messaging = firebase.messaging();

// Handle incoming messages while the app is not in focus (i.e in the background, hidden behind other tabs, or completely closed).
messaging.onBackgroundMessage(function (payload:any) {
  console.log("Received background message ", payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    data: {
      click_action: payload.notification.click_action,
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
self.addEventListener("notificationclick", function (event) {
  var action_click = event.notification.data.click_action;
  event.notification.close();

  event.waitUntil(clients.openWindow(action_click));
});
