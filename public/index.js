let transactions = []; 
let myChart;
let db;
const request = indexedDB.open("budget", 1);
prepareOfflineScenario();

fetch("/api/transaction")
  .then(response => {
    return response.json();
  })
  .then(data => {
    transactions = data;
    if (navigator.onLine) {
      populateTotal();
      populateTable();
      populateChart();
    } else {
      addOfflineItems();
    }
  });

function prepareOfflineScenario(){
    
    request.onupgradeneeded = function(event) {
      const db = event.target.result;
      db.createObjectStore("pending", { autoIncrement: true });
    };
    
    request.onsuccess = function(event) {
      db = event.target.result;
      if (navigator.onLine) {
        checkDatabase();
      }
    };
    
    request.onerror = function(event) {
      console.log("Woops! " + event.target.errorCode);
    };
}

function checkDatabase() {
  const transaction = db.transaction(["pending"], "readwrite");
  const store = transaction.objectStore("pending");
  const getAll = store.getAll();

  getAll.onsuccess = function() {
    if (getAll.result.length > 0) {
      fetch("/api/transaction/bulk", {
        method: "POST",
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json"
        }
      })
      .then(response => response.json())
      .then(() => {
        const transaction = db.transaction(["pending"], "readwrite");
        const store = transaction.objectStore("pending");
        store.clear();
      });
    }
  };
}

function addOfflineItems() {

  const transaction = db.transaction(["pending"], "readwrite");
  const store = transaction.objectStore("pending");
  const getAll = store.getAll();               

  getAll.onsuccess = function() {
    if (getAll.result.length > 0) {
        getAll.result.forEach(temp=>{
            transactions.unshift(temp);
        })
    }
    populateTotal();
    populateTable(); 
    populateChart(); 

  };
}


  function populateTotal() {

  let total = transactions.reduce((total, t) => {
    return total + parseInt(t.value);
  }, 0);

  let totalEl = document.querySelector("#total");
  totalEl.textContent = total;
}


function populateTable() {
  let tbody = document.querySelector("#tbody");
  tbody.innerHTML = "";

  transactions.forEach(transaction => {

    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${transaction.name}</td>
      <td>${transaction.value}</td>
    `;

    tbody.appendChild(tr);
  });
}


function populateChart() {
  let reversed = transactions.slice().reverse();
  let sum = 0;
  let labels = reversed.map(t => {
    let date = new Date(t.date);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  });

  let data = reversed.map(t => {
    sum += parseInt(t.value);
    return sum;
  });

  if (myChart) {
    myChart.destroy();
  }

  let ctx = document.getElementById("myChart").getContext("2d");

  myChart = new Chart(ctx, {
    type: 'line',
      data: {
        labels,
        datasets: [{
            label: "Total Over Time",
            fill: true,
            backgroundColor: "#6666ff",
            data
        }]
    }
  });
}

function sendTransaction(isAdding) {
  let nameEl = document.querySelector("#t-name");
  let amountEl = document.querySelector("#t-amount");
  let errorEl = document.querySelector(".form .error");

  if (nameEl.value === "" || amountEl.value === "") {
    errorEl.textContent = "Missing Information";
    return;
  }
  else {
    errorEl.textContent = "";
  }

  let transaction = {
    name: nameEl.value,
    value: amountEl.value,
    date: new Date().toISOString()
  };

  
  if (!isAdding) {
    transaction.value *= -1;
  }

  transactions.unshift(transaction);

  populateChart();
  populateTable();
  populateTotal();
  
  fetch("/api/transaction", {
    method: "POST",
    body: JSON.stringify(transaction),
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json"
    }
  })
  .then(response => {    
    return response.json();
  })
  .then(data => {
    if (data.errors) {
      errorEl.textContent = "Missing Information";
    }
    else {
      nameEl.value = "";
      amountEl.value = "";
    }
  })
  .catch(err => {
  
    saveRecord(transaction);
    nameEl.value = "";
    amountEl.value = "";
  });
}

function saveRecord(record) {

  const transaction = db.transaction(["pending"], "readwrite");
  const store = transaction.objectStore("pending");
  store.add(record);
}

document.querySelector("#add-btn").onclick = function() {
  sendTransaction(true);
};

document.querySelector("#sub-btn").onclick = function() {
  sendTransaction(false);
};

window.addEventListener("online", checkDatabase);