function getLastNameRoute(url: string) {
  // Split the URL by '/'
  const parts = url.split("/");
  // Get the last part (route)
  const lastNameRoute = parts[parts.length - 1];
  return lastNameRoute;
}

export { getLastNameRoute };
