---
title: Login
layout: default
localScripts:
-  login.js
---
Please enter your credentials

<form action="http://localhost:8080/authorize" method="post">
<div>
      <label for="name">Name:</label>
      <input type="text" id="name" name="username" />
</div>
<div>
      <label for="password">Password:</label>
      <input type="password" id="password" name="password" />
</div>

<div>
      <button id="submit" name="submit">Login</button>
</div>

</form>
