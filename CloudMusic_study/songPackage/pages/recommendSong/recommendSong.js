import request from '../../../utils/request'
import PubSub from 'pubsub-js'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    day: '', //日期
    month: '', //月份
    recommendList: [], //推荐列表数据
    index: 0, // 点击音乐的下标
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 判断用户是否登录
    let userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'error',
        success: () => {
          // 跳转至登录界面
          wx.reLaunch({
            url: '/pages/login/login',
          })
        }
      })
    }

    // 更新日期的状态数据
    this.setData({
      day: new Date().getDate(),
      month: new Date().getMonth() + 1
    })

    this.getRecommendList()

    // 订阅来自songDetail页面发布的消息
    PubSub.subscribe('switchType', (msg, type) => {
      let { recommendList, index } = this.data
      if (type === 'pre') { // 上一首
        (index === 0) && (index = recommendList.length)
        index -= 1
      } else { //下一首
        (index === recommendList.length - 1) && (index = -1)
        index += 1
      }

      // 更新下标
      this.setData({
        index
      })

      let musicId = recommendList[index].id;
      // 将musicId回传给songDetail页面

      PubSub.publish('musicId', musicId)
    })
  },

  // 获取用户每日推荐数据
  async getRecommendList() {
    // 获取每日推荐的数据
    let recommendListData = await request('/recommend/songs')
    this.setData({
      recommendList: recommendListData.data.dailySongs
    })
  },

  // 跳转至songDetail页面
  toSongDetail(event) {
    let { song, index } = event.currentTarget.dataset

    this.setData({
      index
    })

    // 路由跳转传参: query参数
    wx.navigateTo({
      // 不能直接将song对象作为参数传递, 长度过长, 会被自动截取掉
      url: '/songPackage/pages/songDetail/songDetail?musicId=' + song.id
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})