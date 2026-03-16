Here is the UI related google sheet -
[[https://docs.google.com/spreadsheets/d/1oilmFIMjAZuMmINlBXHTuxKvIscMau8wAkA9m8KbYTI/edit?usp=sharing]{.underline}](https://docs.google.com/spreadsheets/d/1oilmFIMjAZuMmINlBXHTuxKvIscMau8wAkA9m8KbYTI/edit?usp=sharing)

Another UI -
[[https://docs.google.com/spreadsheets/d/1NWkW0hZDUd83TPi6QPYDo389S7Myl2dWiuhb6zkm_o8/edit?gid=0#gid=0]{.underline}](https://docs.google.com/spreadsheets/d/1NWkW0hZDUd83TPi6QPYDo389S7Myl2dWiuhb6zkm_o8/edit?gid=0#gid=0)

### **Project Overview**

This is a delivery routing system for meal deliveries where we optimize
driver routes, distribute deliveries evenly, and handle multiple
WordPress sites. The goal is to use HERE Map APIs for route
visualization after optimization, with minimal coding and low ongoing
costs.

### **1. Admin Panel Setup**

**Features:**

-   **Number of Drivers:** Admin can specify the number of drivers for
    > the day.

-   **Include Admin as Driver:** Admin can choose to be part of the
    > driver pool.

-   **Navigation App Preference:** Admin can select whether drivers use
    > **Google Maps** or **HERE Maps** for navigation.

-   **Stock Refill Toggle:** If activated, drivers will return to the
    > kitchen depot when they run out of meals.

-   **Max Deliveries Per Route:** Admin can limit the number of
    > deliveries a driver can make in one trip.

-   **Daily Route Limit:** Admin can set a cap on the total number of
    > routes for the day.

-   **Save Configuration:** Save all settings in the backend for reuse.

**Driver Settings:**

-   Admin can view all drivers, assign them to depots, and add new
    > drivers (with name, email, MPG, depot).

-   Each driver has a **Miles per Gallon (MPG)** input for fuel cost
    > calculations.

**Depot Management:**

-   Admin can add and manage depots (location, name).

**Fuel Settings:**

-   Admin inputs the global fuel price to be used for route cost
    > estimations.

**Help & Tooltips:**

-   Option to toggle field-level help tips.

### **2. Orders Management Screen**

**Tab 1: Filter Orders**

-   Display eligible orders based on WooCommerce order status.

-   Postcode filter list to choose which delivery areas (postcodes) to
    > include.

-   Preview clustering (zones) before generating routes.

-   Option to trigger route generation by sliding to confirm.

**Tab 2: Route Review**

-   Display route summary cards with zone names, ETA, distance, stop
    > count, fuel estimates, and navigation method.

-   Assign drivers to individual routes or auto-assign routes using
    > load-balancing or round-robin logic.

-   Option to regenerate routes with different configurations.

-   Confirm routes before dispatching to drivers.

**Tab 3: Route Dispatch**

-   Final route summary for each driver.

-   Track dispatch status (Not Started, In Progress, Delivered).

-   Button to push confirmed routes to drivers for execution.

### **3. Driver Screen (Mobile)**

-   **Route List View:** Displays assigned routes with a summary of
    > zone, stops, and ETA.

-   **Stop Checklist:** Displays each delivery stop (address, status,
    > notes).

-   **Navigation Button:** Opens the stop in the selected map app
    > (Google or HERE).

-   **Progress Bar:** Displays the completion status of the route (how
    > many stops are completed).

### **4. Backend Architecture**

**Node.js Setup:**

-   **.env file** for storing sensitive configurations (e.g., DB, HERE
    > API keys).

-   **MVC structure** (Model-View-Controller) to keep the codebase
    > organized.

-   **Express Router Setup** for modular routes (e.g., /orders,
    > /drivers).

-   **Database Integration:** Use **Supabase** (PostgreSQL) for storing
    > orders, drivers, depots, etc.

-   **Authentication:** JWT-based token authentication for secure access
    > control.

-   **Role Enforcement:** Admins can manage drivers and routes, while
    > staff can only view assigned routes.

### **5. Routing Algorithm (Optimization)**

**Current Assumptions (for now):**

-   We are considering using **clustering algorithms** like **KMeans**
    > or **DBSCAN** to group nearby orders into **clusters** (zones) for
    > more efficient routing.

-   **HERE Matrix API** will be used to calculate **travel times**
    > between stops to optimize the overall route, minimizing fuel costs
    > and travel time.

-   We are planning to implement a **round-trip logic**, where drivers
    > return to the kitchen after a set number of deliveries (based on
    > their capacity) and then go back out with new orders. This is
    > aimed at maximizing efficiency by not having drivers go to the
    > farthest delivery point without returning.

-   Once routes are optimized, we will generate **Google Maps** or
    > **HERE Maps** links for drivers to navigate easily.

**Note:** These are **current assumptions**, but the final routing
algorithms should be flexible enough to meet our needs as we scale and
evolve, so the chosen algorithms should be adaptable for potential
future adjustments.

### **6. Integration with WordPress**

-   Orders will be pulled from **WooCommerce** via the **Woo REST API**.
    > The system will only push **home deliveries** to the xRuto
    > platform.

-   We'll need a webhook or manual sync mechanism to pull orders from
    > WooCommerce to the xRuto system.

-   The system will filter out non-home delivery orders, only pushing
    > orders that require home delivery to the xRuto platform.

### **7. Minimal Coding Requirements**

-   **Keep it simple and minimal**: We want to limit custom code to
    > what's absolutely necessary to maintain low development costs.

-   **Code Comments**: Ensure proper comments are added to all code for
    > easy future modifications.

-   **Version Control**: Use **Git** for version control, with clear
    > commits and documentation.

-   **Algorithm Explanation**: Provide clear documentation for the
    > algorithms used for clustering and route optimization.

### **8. Cost Control**

-   **Use of HERE Map APIs** to reduce ongoing costs.

-   **Notify in advance** if any new APIs or features will incur
    > additional costs.

-   Ensure that the **cost of API usage** is low by using efficient
    > algorithms (e.g., batching, minimizing API calls).

### **9. Delivery System for Multiple WordPress Sites**

-   We need the system to be able to link to multiple **WordPress
    > sites** using **storeId** to differentiate orders.

-   Only home deliveries will be pushed to the xRuto system, and routes
    > will be generated and dispatched accordingly.

### **10. Future Scalability**

-   The developer should design the system in a way that allows for easy
    > future enhancements, such as adding more delivery options or
    > integrating other APIs.

-   Use standard practices to ensure the system can scale as we expand
    > the platform.

### **Key Points for the Developer:**

-   This is **not a GPS map system**---we are generating **optimized
    > delivery routes** and integrating them with HERE/Google Maps for
    > visualization.

-   We need a **batch delivery system** where routes are efficiently
    > optimized and distributed among drivers.

-   The system will be used for businesses with a **10-15 mile delivery
    > radius**.

-   The goal is to minimize **costs**---both in terms of **development**
    > and **API usage**---while ensuring that **each step is
    > efficient**.
