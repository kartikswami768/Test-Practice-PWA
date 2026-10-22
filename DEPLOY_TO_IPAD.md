# Put Recall on your iPad Home Screen

The files in this package are the app source. To install it as a PWA, the folder must be served from an HTTPS website; opening `index.html` directly from Files is useful for inspection but does not enable service-worker caching or normal PWA installation.

## One route: GitHub Pages

1. Extract `Recall-MCQ-PWA-v1.zip` on a computer.
2. Create a GitHub repository for the app and upload the **contents** of the `mcq-practice-pwa` folder to the repository root. `index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, `service-worker.js` and `icons/` must remain in the same relative layout.
3. In the repository, open **Settings → Pages**.
4. Under the build/deployment source, choose **Deploy from a branch**, select the default branch and `/ (root)`, then save.
5. Wait for the Pages deployment to finish. Open the published HTTPS URL and verify the sample paper works.
6. On the iPad, open the published URL in Safari.
7. Tap **Share → Add to Home Screen**, enable **Open as Web App** if shown, then tap **Add**.
8. Launch Recall from the new Home Screen icon. Open it once while online so the service worker can cache the app shell, then test a question paper with Wi-Fi temporarily disabled.

### Privacy note

On GitHub Free, GitHub Pages requires the repository to be public. That means the app's source code and included sample/template files are public. The app does not automatically upload question papers imported at runtime: the most recent Markdown file is stored in local browser storage on your iPad. Do not put private question papers or copyrighted answer explanations into the public source repository.

Official instructions:
- GitHub Pages setup: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- Add a website as an app on iPad: https://support.apple.com/guide/ipad/ipad8f1f7a29/ipados
