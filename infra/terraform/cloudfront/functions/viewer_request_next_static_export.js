// Viewer-request rewrite for Next static export on S3 (REST origin + OAC).
// Extensionless paths like /profile must map to /profile.html.

function handler(event) {
  var request = event.request;
  var uri = request.uri || "/";

  if (uri.startsWith("/_next/")) {
    return request;
  }

  if (uri.includes(".")) {
    return request;
  }

  if (uri.endsWith("/")) {
    request.uri = uri + "index.html";
    return request;
  }

  request.uri = uri + ".html";
  return request;
}
