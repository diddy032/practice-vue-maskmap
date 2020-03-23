import Vue from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'
import VueAxios from 'vue-axios'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/vue-loading.css'
import distanceFilter from './filters/distance'
import './bus'

Vue.config.productionTip = false
Vue.use(VueAxios, axios)
Vue.component('Loading', Loading)
Vue.filter('distance', distanceFilter)
new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
