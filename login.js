document
  .getElementById("loginForm")
  .addEventListener("submit", function (e) {

    e.preventDefault();

    const email =
      document.getElementById("email").value;

    const password =
      document.getElementById("password").value;

    /* DEMO LOGIN */

    if (
      email === "admin@vitals.com" &&
      password === "1234"
    ) {

      alert("Login successful!");

      /* Redirect to dashboard */
      window.location.href = "index.html";

    } else {

      alert("Invalid email or password");
    }
});