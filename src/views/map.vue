<template>
  <div>
    <loading :active.sync="isLoading"></loading>
    <div class="wrap">
      <div class="sidebar-frame">
        <label class="menu-btn show-cursor" for="" @click="toggleSidebar">
          <img src="../assets/images/bg_drag.svg" alt="">
        </label>
        <div class="sidebar">
          <div class="header">
            <div class="header-title">口罩即時地圖</div>
            <div class="header-right">
              <div class="header-source">資料來源：衛福部</div>
              <div class="header-today">{{nowTime}}</div>
            </div>
            <div class="clearfix"></div>
          </div>
          <div class="img-frame">
            <div class="img-banner">
              <div class="banner-day">{{nowDay}}</div>
              <div class="banner-num">{{idNum}}</div>
            </div>
          </div>
          <div class="location-title">現在位置</div>
          <div class="location">
            <div class="location-city">
              <select class="cityName show-cursor" v-model="select.city" @change="select.area = ''">
                <option value="" disabled selected hidden>請選擇縣市</option>
                <option :value="c.CityName" v-for="c in cityName" :key="c.CityName">{{ c.CityName }}</option>
              </select>
            </div>
            <div class="location-area">
              <select class="areaName show-cursor" v-model="select.area" @change="changeMap">
                <option value="" disabled selected hidden>請選擇地區</option>
                <option :value="a.AreaName" v-for="a in cityName.find((city) => city.CityName === select.city).AreaList"
                  :key="a.AreaName">{{ a.AreaName }}</option>
              </select>
            </div>
            <div class="clearfix"></div>
          </div>
          <div class="mask-category" v-if="pharmacies.length>0">
            <button class="show-cursor" @click="setMaskCategory('all')" :class="{isActive : maskCategory ==='all'}">所有口罩</button>
            <button class="show-cursor" @click="setMaskCategory('adult')" :class="{isActive : maskCategory ==='adult'}">成人口罩</button>
            <button class="show-cursor" @click="setMaskCategory('child')" :class="{isActive : maskCategory ==='child'}">兒童口罩</button>
          </div>
          <hr class="divider">
          <div class="container">
            <div class="container-header">
              <div class="container-title" v-if="pharmacies.length>0">此區的店家</div>
              <div class="container-title" v-else>請選擇要搜尋的區域</div>
              <div class="container-buttons">
                <button class="show-cursor" v-if="haveUserPosition" @click="filterStore" :class="{isActive : distanceActive}">距離最近</button>
                <button class="show-cursor" v-if="likeStore.length>0" @click="getLikeStoreData" :class="{isActive : likeStoreActive}">已標星號</button>
              </div>
              <div class="clearfix"></div>
            </div>
            <div class="properties-show-frame">
              <ul class="properties-show" v-for="item in pharmacies" :key="item.pharmacies">
                <li class="properties-card show-cursor" @click="penTo(item, true)">
                  <div class="properties-card-warp">
                    <div class="properties-card-left">
                      <div class="properties-header">
                        <h4 class="properties-name">{{item.properties.name}}</h4>
                        <div class="properties-distance">{{item.geometry.coordinates[2]|distance}}</div>
                      </div>
                      <div class="properties-info">
                        <div>{{item.properties.address}}</div>
                        <div>{{item.properties.phone}}</div>
                        <div>口罩發放時間：{{item.properties.note}}</div>
                      </div>
                    </div>
                    <div class="properties-card-right">
                      <a @click.stop="EditLikeList(item.properties.id)">
                        <img class="card-icon" src="../assets/images/icon_star_unselected.svg" alt="" v-if="likeStore.indexOf(item.properties.id)=== -1">
                        <img class="card-icon" src="../assets/images/icon_star_selected.svg" alt="" v-else>
                      </a>
                      <a :href="`https://www.google.com.tw/maps/place/${item.properties.address}`" target="_blank">
                        <img class="card-icon" src="../assets/images/icon_nav.svg" alt="">
                      </a>
                    </div>
                  </div>
                  <div class="mask-info">
                    <div class="mask-adult" :class="(item.properties.mask_adult>0 ? 'bg-color-info':'bg-color-dark')">
                      <div>成人</div>
                      <div class="mask-num">{{item.properties.mask_adult}}</div>
                    </div>
                    <div class="mask-child" :class="(item.properties.mask_child>0 ? 'bg-color-info':'bg-color-dark')">
                      <div>小孩</div>
                      <div class="mask-num">{{item.properties.mask_child}}</div>
                    </div>
                  </div>
                  <div class="properties-updated">{{item.properties.updated}}更新</div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div id="map"></div>
    </div>
  </div>
</template>

<script>
import $ from 'jquery'
import L from 'leaflet'
import 'leaflet.markercluster'
import cityName from '../assets/Cityname.json'

let osmMap = {}
const blueIcon = new L.Icon({
  iconUrl: 'https://i.postimg.cc/T3F508pk/icon-map-2x.png',
  iconSize: [50, 50],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})
const redIcon = new L.Icon({
  iconUrl: 'https://i.postimg.cc/fLj3MJ5F/icon-nav-me-2x.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

export default {
  data () {
    return {
      data: [],
      pharmacies: [],
      likeStore: JSON.parse(localStorage.getItem('Like Item List')) || [],
      haveUserPosition: false,
      userMarker: null,
      userPosition: null,
      isLoading: false,
      distanceActive: false,
      likeStoreActive: false,
      screenWidth: document.body.clientWidth,
      maskCategory: '',
      nowTime: '',
      nowDay: '',
      idNum: '',
      cityName,
      select: {
        city: '臺北市',
        area: ''
      }
    }
  },
  methods: {
    openMap () {
      const vm = this
      osmMap = L.map('map', {
        center: [25.03, 121.55],
        zoom: 15
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '<a target="_blank" href="https://www.openstreetmap.org/">© OpenStreetMap 貢獻者</a>',
        maxZoom: 18
      }).addTo(osmMap)

      const url = 'https://raw.githubusercontent.com/kiang/pharmacies/master/json/points.json'
      vm.$http.get(url).then((response) => {
        vm.data = response.data.features
        vm.updataMap()
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            function (position) {
              vm.userPosition = [position.coords.latitude, position.coords.longitude]
              osmMap.setView(new L.LatLng(vm.userPosition[0], vm.userPosition[1]), 17)
              vm.userMarker = L.marker([vm.userPosition[0], vm.userPosition[1]], { icon: redIcon, title: '目前位置' }).bindPopup('<h5>目前位置</h5>').addTo(osmMap).openPopup()
              osmMap.addLayer(vm.userMarker)
              if (vm.userMarker !== null) {
                vm.haveUserPosition = true
              }
              vm.showLocation()
            },
            function () {
              vm.showLocation()
            }
          )
        }
      })
    },
    updataMap () {
      const vm = this
      const markers = L.markerClusterGroup().addTo(osmMap)
      let filterData = []
      if (vm.pharmacies) {
        filterData = vm.data
      } else {
        filterData = vm.pharmacies
      }
      filterData.forEach(pharmacy => {
        markers.addLayer(L.marker([
          pharmacy.geometry.coordinates[1],
          pharmacy.geometry.coordinates[0]
        ], { weight: 1.5, color: '#222', opacity: 1, icon: blueIcon }).bindPopup(`
        <div class="markers-properties-card-warp">
          <div class="markers-properties-card-left">
            <h4 class="markers-properties-name">${pharmacy.properties.name}</h4>
            <div class="markers-properties-info">
              地址: <a href="https://www.google.com.tw/maps/place/${pharmacy.properties.address}" target="_blank">${pharmacy.properties.address}</a><br>
              電話: ${pharmacy.properties.phone}<br>
            </div>
          </div>
          <div class="markers-properties-card-right">
            <a class="addLike" data-id="${pharmacy.properties.id}"><div class="markers-icon ${vm.likeStore.indexOf(pharmacy.properties.id) === -1 ? 'icon-unstar' : 'icon-star'}"></div></a>
            <a href="https://www.google.com.tw/maps/place/${pharmacy.properties.address}" target="_blank"><div class="markers-icon icon-road"></div></a>
        </div>
        </div>
        <div class="markers-mask-info">
          <div class="markers-mask-adult ${pharmacy.properties.mask_adult ? 'bg-color-info' : 'bg-color-dark'}">
            <div>成人</div>
            <div class="markers-mask-num">${pharmacy.properties.mask_adult ? `${pharmacy.properties.mask_adult}` : '0'}</div>
          </div>
          <div class="markers-mask-child ${pharmacy.properties.mask_child ? 'bg-color-info' : 'bg-color-dark'}">
            <div>兒童</div>
            <div class="markers-mask-num">${pharmacy.properties.mask_child ? `${pharmacy.properties.mask_child}` : '0'}</div>
          </div>                 
        </div>
        <div class="markers-properties-info">最後更新時間: ${pharmacy.properties.updated}</div>`))
      })
      osmMap.addLayer(markers)
      vm.isLoading = false
      vm.setMapStaricon()
    },
    changeMap () {
      this.removeMarker()
      this.pharmacies = []
      this.pharmacies = this.data.filter((pharmacy) => pharmacy.properties.town === this.select.area)
      this.updataMap()
      this.penTo(this.pharmacies[0], true)
      if (this.haveUserPosition) {
        this.updatUserPosition()
      }
    },
    removeMarker () {
      osmMap.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          osmMap.removeLayer(layer)
        }
      })
    },
    updatUserPosition () {
      const vm = this
      navigator.geolocation.getCurrentPosition(
        function (position) {
          vm.userPosition = [position.coords.latitude, position.coords.longitude]
          L.marker(new L.LatLng(vm.userPosition[0], vm.userPosition[1]), 17)
          vm.userMarker = L.marker([vm.userPosition[0], vm.userPosition[1]], { icon: redIcon, title: '目前位置' }).bindPopup('<h5>目前位置</h5>').addTo(osmMap)
          osmMap.addLayer(vm.userMarker)
        }
      )
    },
    setMapStaricon () {
      const vm = this
      osmMap.on('layeradd', function () {
        const addlikeBtns = [...document.querySelectorAll('.addLike')]
        addlikeBtns.forEach(btn => {
          btn.addEventListener('click', addLike, false)
          function addLike () {
            const id = this.dataset.id
            const pharmacy = vm.data.find(element => {
              return element.properties.id === id
            })
            vm.EditLikeList(id)
            vm.penTo(pharmacy, false)
          }
        })
      })
    },
    showLocation () {
      const vm = this
      if (vm.userPosition !== null) {
        vm.calDistance()
        vm.filterStore()
      } else {
        alert('沒有目前位置')
        vm.distanceActive = false
      }
    },
    // 計算距離
    calDistance () {
      const vm = this
      vm.data.forEach(pharmacy => {
        const storeLongitude = pharmacy.geometry.coordinates[0]
        const storeLatitude = pharmacy.geometry.coordinates[1]
        const distance = vm.getDistance(vm.userPosition[0], vm.userPosition[1], storeLatitude, storeLongitude)
        pharmacy.geometry.coordinates[2] = distance
      })
    },
    // 顯示距離內的藥局並由近到遠排列
    filterStore () {
      const vm = this
      const num = vm.data[0].geometry.coordinates.length
      if (num < 3 && vm.haveUserPosition === true) {
        vm.calDistance()
      } else {
        vm.pharmacies = []
        vm.distanceActive = true
        vm.likeStoreActive = false
        vm.maskCategory = ''
        vm.pharmacies = vm.data.filter(pharmacy => {
          return pharmacy.geometry.coordinates[2] <= 5
        })
        vm.pharmacies = vm.pharmacies.sort((x, y) =>
          x.geometry.coordinates[2] - y.geometry.coordinates[2]
        )
      }
    },
    penTo (pharmacy, toggleSite) {
      const { properties, geometry } = pharmacy
      const vm = this
      if (toggleSite) {
        vm.mobilSide()
      }
      osmMap.panTo(new L.LatLng(geometry.coordinates[1], geometry.coordinates[0], properties))
      L.marker([pharmacy.geometry.coordinates[1], pharmacy.geometry.coordinates[0]], { weight: 1.5, color: '#222', opacity: 1, icon: blueIcon }).bindPopup(`
      <div class="markers-properties-card-warp">
        <div class="markers-properties-card-left">
          <h4 class="markers-properties-name">${pharmacy.properties.name}</h4>
          <div class="markers-properties-info">
            地址: <a href="https://www.google.com.tw/maps/place/${pharmacy.properties.address}" target="_blank">${pharmacy.properties.address}</a><br>
            電話: ${pharmacy.properties.phone}<br>
          </div>
        </div>
        <div class="markers-properties-card-right">
          <a class="addLike" data-id="${pharmacy.properties.id}"><div class="markers-icon ${vm.likeStore.indexOf(pharmacy.properties.id) === -1 ? 'icon-unstar' : 'icon-star'}"></div></a>
          <a href="https://www.google.com.tw/maps/place/${pharmacy.properties.address}" target="_blank"><div class="markers-icon icon-road"></div></a>
        </div>
      </div>
      <div class="markers-mask-info">
        <div class="markers-mask-adult ${pharmacy.properties.mask_adult ? 'bg-color-info' : 'bg-color-dark'}">
          <div>成人</div>
          <div class="markers-mask-num">${pharmacy.properties.mask_adult ? `${pharmacy.properties.mask_adult}` : '0'}</div>
        </div>
        <div class="markers-mask-child ${pharmacy.properties.mask_child ? 'bg-color-info' : 'bg-color-dark'}">
          <div>兒童</div>
          <div class="markers-mask-num">${pharmacy.properties.mask_child ? `${pharmacy.properties.mask_child}` : '0'}</div>
        </div>                 
      </div>
      <div class="markers-properties-info">最後更新時間: ${pharmacy.properties.updated}</div>`).addTo(osmMap).openPopup()
    },
    EditLikeList (StoreId) {
      const vm = this
      const num = vm.likeStore.indexOf(StoreId)
      if (num === -1) {
        vm.likeStore.push(StoreId)
      } else {
        vm.likeStore.splice(num, 1)
      }
      localStorage.setItem('Like Item List', JSON.stringify(vm.likeStore))
    },
    getLikeStoreData () {
      const vm = this
      vm.distanceActive = false
      vm.likeStoreActive = true
      vm.pharmacies = vm.data.filter((element, index, array) => vm.likeStore.indexOf(element.properties.id) > -1)
    },
    setMaskCategory (category) {
      const vm = this
      this.distanceActive = false
      if (category === 'all') {
        vm.maskCategory = 'all'
        vm.pharmacies = vm.pharmacies.sort((x, y) =>
          (y.properties.mask_adult + y.properties.mask_child) - (x.properties.mask_adult + x.properties.mask_child)
        )
      } else if (category === 'adult') {
        vm.maskCategory = 'adult'
        vm.pharmacies = vm.pharmacies.sort((x, y) =>
          y.properties.mask_adult - x.properties.mask_adult
        )
      } else if (category === 'child') {
        vm.maskCategory = 'child'
        vm.pharmacies = vm.pharmacies.sort((x, y) =>
          y.properties.mask_child - x.properties.mask_child
        )
      }
    },
    getDistance (lat1, lng1, lat2, lng2) {
      return 2 * 6378.137 * Math.asin(Math.sqrt(Math.pow(Math.sin(Math.PI * (lat1 - lat2) / 360), 2) + Math.cos(Math.PI * lat1 / 180) * Math.cos(Math.PI * lat2 / 180) * Math.pow(Math.sin(Math.PI * (lng1 - lng2) / 360), 2)))
    },
    nowDate () {
      const vm = this
      const dayList = ['日', '一', '二', '三', '四', '五', '六']
      const date = new Date()
      const dateDay = new Date().getDay()
      vm.nowTime = date.getFullYear() + '年' + (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '月' + (date.getDate() < 10 ? '0' + (date.getDate()) : date.getDate()) + '日'
      vm.nowDay = '星期' + dayList[dateDay]
      if (dateDay === 2 || dateDay === 4 || dateDay === 6) {
        vm.idNum = '2.4.6.8.0'
      } else if (dateDay === 1 || dateDay === 3 || dateDay === 5) {
        vm.idNum = '1.3.5.7.9'
      } else {
        vm.idNum = '所有號碼'
      }
    },
    toggleSidebar () {
      $('.sidebar-frame').toggleClass('sidebar-frame-actiev')
      setTimeout(function () {
        $('.sidebar').toggleClass('sidebar-actiev')
      }, 200)
    },
    mobilSide () {
      if (window.screen.width < 500) {
        this.toggleSidebar()
      }
    }
  },
  watch: {
    screenWidth (val) {
      if (!this.timer) {
        const vm = this
        vm.screenWidth = val
        setTimeout(function () {
          if (vm.screenWidth < 500) {
            vm.mobilSide()
          }
        }, 10)
      }
    }
  },
  created () {
    this.isLoading = true
    this.nowDate()
    window.onresize = () => {
      return (() => {
        window.screenWidth = document.body.clientWidth
        this.screenWidth = window.screenWidth
      })()
    }
  },
  mounted () {
    this.openMap()
    this.mobilSide()
  }
}
</script>
<style lang="scss">
.img-banner {
  background-image: url('../assets/images/banner_announce_fix.png');
}
.icon-unstar {
  background-image: url('../assets/images/icon_star_unselected.svg');
}
.icon-star {
  background-image: url('../assets/images/icon_star_selected.svg');
}
.icon-road {
  background-image: url('../assets/images/icon_nav.svg');
}
</style>
