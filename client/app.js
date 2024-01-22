window.paypal
  .Buttons({
    async createOrder() {
      try {
        console.log("app.js - createOrder");
        const response = await fetch("/server/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          // use the "body" param to optionally pass additional order information
          // like product ids and quantities
          body: JSON.stringify({
            cart: [
              {
                id: "600117",
                quantity: "108",
              },
            ],
          }),
        });

        const orderData = await response.json();

        if (orderData.id) {
          return orderData.id;
        } else {
          const errorDetail = orderData?.details?.[0];
          const errorMessage = errorDetail
            ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
            : JSON.stringify(orderData);

          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error(error);
        resultMessage(`Could not initiate PayPal Checkout...<br><br>${error}`);
      }
    },
    async onApprove(data, actions) {
      console.log("app.js - onApprove");
      try {
        //note the ` ` instead of " " - to pass through params into the URL
        /*
            Capture => /server/api/orders/${data.orderID}/capture`
            Authorization => /server/api/orders/${data.orderID}/authorize`
        */
        const response = await fetch(
          `/server/api/orders/${data.orderID}/authorize`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const orderData = await response.json();
        // Three cases to handle:
        //   (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
        //   (2) Other non-recoverable errors -> Show a failure message
        //   (3) Successful transaction -> Show confirmation or thank you message

        const errorDetail = orderData?.details?.[0];

        if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
          // (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
          // recoverable state, per https://developer.paypal.com/docs/checkout/standard/customize/handle-funding-failures/
          return actions.restart();
        } else if (errorDetail) {
          // (2) Other non-recoverable errors -> Show a failure message
          throw new Error(`${errorDetail.description} (${orderData.debug_id})`);
        } else if (!orderData.purchase_units) {
          throw new Error(JSON.stringify(orderData));
        } else {
          // (3) Successful transaction -> Show confirmation or thank you message
          // Or go to another URL:  actions.redirect('thank_you.html');
          const transaction =
            orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
            orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
          resultMessage(
            `Transaction ${transaction.status}: ${transaction.id}<br><br>See console for all available details`
          );
          console.log(
            "Capture result",
            orderData,
            JSON.stringify(orderData, null, 2)
          );
        }
      } catch (error) {
        console.error(error);
        resultMessage(
          `Sorry, your transaction could not be processed...<br><br>${error}`
        );
      }
    },

    style: {
      layout: "vertical",
      color: "gold",
      shape: "pill",
      label: "paypal",
      //tagline: 'true' // applicable only for layout: 'horizontal'
    },

    onShippingOptionsChange(data) {
      // data.selectedShippingOption contains the selected shipping option
      console.log("SELECTED_OPTION", data.selectedShippingOption);
    },

    onShippingAddressChange(data) {
      // data.shippingAddress contains the selected shipping address
      console.log("SHIPPING_ADDRESS", data.shippingAddress);
    },

    onClick: (data) => {
      // fundingSource = "venmo"
      fundingSource = data.fundingSource;

      // Use this value to determine the funding source used to pay
      // Update your confirmation pages and notifications from "PayPal" to "Venmo"
      console.log("FUNDING_SOURCE", fundingSource);
    },

    onCancel: function (data) {
      // Show a cancel page, or return to cart
      console.log("CANCEL clicked", data);
    },
    
    // onInit is called when the button first renders
    onInit: function(data, actions) {
      // Disable the buttons
      actions.disable();
      // Listen for changes to the checkbox
      document.querySelector('#check')
        .addEventListener('change', function(event) {
          // Enable or disable the button when it is checked or unchecked
          if (event.target.checked) {
            actions.enable();
          } else {
            actions.disable();
          }
        });
    },
    // onClick is called when the button is clicked
    onClick: function() {
      // Show a validation error if the checkbox is not checked
      if (!document.querySelector('#check').checked) {
        document.querySelector('#error').classList.remove('hidden');
      }
    },

  })
  .render("#paypal-button-container");

// Example function to show a result to the user. Your site's UI library can be used instead.
function resultMessage(message) {
  const container = document.querySelector("#result-message");
  container.innerHTML = message;
}
