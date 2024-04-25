// pages/video/video.js
import request from '../../utils/request'
Page({

  /**
   * 页面的初始数据
   */
  data: {
    videoGroupList: [], //导航标签数据
    navId: '', //导航标识
    videoList: [], //视频列表数据
    videoId: '', //视频id标识
    videoUpateTime: [], //记录video播放的时长
    isTriggered: false,  //标识下拉刷新是否被触发
    isToLowered: false, //标识上拉触底是否被触发
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 显示正在加载
    wx.showLoading({
      title: '正在加载'
    })
    // 获取导航数据
    this.getVideoGroupListData()
  },

  // 获取导航数据
  async getVideoGroupListData() {
    let videoGroupListData = await request('/video/group/list')
    this.setData({
      videoGroupList: videoGroupListData.data.slice(0, 14),
      navId: videoGroupListData.data[0].id
    })

    // 获取视频列表数据
    this.getVideoList(this.data.navId)

  },

  // 获取视频列表数据
  async getVideoList(navId) {
    if (!navId) { // 判断navId为空串的情况
      return;
    }
    // 每次请求时随机获取视频(0-500页)
    let random = Math.floor(Math.random() * 500);
    let videoListData = await request('/video/group', { id: navId, offset: random })

    let index = 0
    let videoList = videoListData.datas.map(item => {
      item.id = index++;
      return item;
    })

    // 获取视频链接
    for (let i = 0; i < videoList.length; i++) {
      let videoUrl = await request('/video/url', { id: videoList[i].data.vid })
      videoList[i].url = videoUrl.urls[0].url
    }

    this.setData({
      videoList,
      index,
      isTriggered: false, // 关闭下拉刷新
    })

    // 关闭消息提示框
    wx.hideLoading()

  },

  // 点击切换导航的回调
  changeNav(event) {
    let navId = event.currentTarget.id; //通过id向event传参的时候如果传的是number会自动转换成string
    // let navId = event.currentTarget.dataset.id //通过data-id传参不用转换类型
    this.setData({
      // navId: navId * 1 //转换成number类型
      navId: navId >>> 0, //右移零位会将非number数据强制转换成number类型
      videoList: [] //视频列表数据
      // navId
    })

    // 显示正在加载
    wx.showLoading({
      title: '正在加载'
    })

    // 动态获取当前导航对应的视频数据
    this.getVideoList(this.data.navId);
  },

  // 点击播放/继续播放的回调
  handlePlay(event) {
    /**
     * 需求:
     *  1.在点击播放的事件中需要找到上一个播放的视频
     *  2.在播放新的视频之前关闭上一个正在播放的视频
     * 关键:
     *  1.如何找到上一个视频的实例对象
     *  2.如何确认点击播放的视频和正在播放的视频不是同一个视频
     * 单例模式：
     *  1.需要创建多个对象的场景下, 通过一个变量接收, 始终保持只有一个对象,
     *  2.节省内存空间
     */

    let vid = event.currentTarget.id
    // 关闭上一个播放的视频
    // this.vid !== vid && this.videoContext && this.videoContext.stop();
    // this.vid = vid

    // 更新data中videoId的状态数据
    this.setData({
      videoId: vid
    })
    // 创建控制video标签的实例对象
    this.videoContext = wx.createVideoContext(vid)
    // 判断当前的视频之前是否播放过, 是否有播放记录, 如果有, 跳转至指定的播放位置
    let { videoUpateTime } = this.data
    let videoItem = videoUpateTime.find(item => item.vid === vid)
    if (videoItem) {
      this.videoContext.seek(videoItem.currentTime);
    }
    // this.videoContext.play();


  },

  // 监听视频播放进度的回调
  handleTimeUpdate(event) {
    // console.log(event.detail.currentTime)
    let videoTimeObj = { vid: event.currentTarget.id, currentTime: event.detail.currentTime }
    let { videoUpateTime } = this.data

    /**
     * 思路：判断记录播放时长的videoUpdateTime数组中是否有当前视频的播放记录
     *  1.如果有, 在原有的播放记录中修改播放时间为当前的播放时间
     *  2.如果没有, 需要在数组中添加当前视频的播放对象
     */
    let videoItem = videoUpateTime.find(item => item.vid === videoTimeObj.vid)
    if (videoItem) { //之前有
      videoItem.currentTime = videoTimeObj.currentTime
    } else {
      videoUpateTime.push(videoTimeObj)
    }
    // 更新videoUpateTime的状态
    this.setData({
      videoUpateTime
    })
  },

  // 视频播放结束调用
  handleEnded(event) {
    // 移除播放记录时长数组中当前视频的对象
    let { videoUpateTime } = this.data
    let index = videoUpateTime.findIndex(item => item.vid === event.currentTarget.id)
    videoUpateTime.splice(index, 1)
    this.setData({
      videoUpateTime
    })
  },

  // 自定义下拉刷新的回调：scroll-view
  handleRefresher() {
    // 显示正在加载
    wx.showLoading({
      title: '正在加载'
    })
    // 再次发请求, 获取最新的视频列表数据
    this.getVideoList(this.data.navId)
  },

  // 自定义上拉触底的回调：scroll-view
  async handlToLower() {
    /**
     * 数据分页:
     *  1.后端分页
     *  2.前端分页
     */

    // 显示正在加载
    wx.showLoading({
      title: '正在加载'
    })

    if (!this.data.navId) { // 判断navId为空串的情况
      return;
    }
    // 每次请求时随机获取视频(0-500页)
    let random = Math.floor(Math.random() * 500);
    let videoListData = await request('/video/group', { id: this.data.navId, offset: random })

    let newVideoList = videoListData.datas

    // 获取视频链接
    for (let i = 0; i < newVideoList.length; i++) {
      let videoUrl = await request('/video/url', { id: newVideoList[i].data.vid })
      newVideoList[i].url = videoUrl.urls[0].url
    }

    // 将新的视频增加到原来的videoList中
    let videoList = this.data.videoList.concat(newVideoList)

    // 重新给整个videoList设置id, 防止出现同名id
    let newIndex = 0
    videoList = videoList.map(item => {
      item.id = newIndex++;
      return item;
    })

    // 更新videoList
    this.setData({
      videoList,
      isToLowered: false
    })

    // 关闭消息提示框
    wx.hideLoading()
  },

  // 跳转至搜索界面
  toSearch() {
    wx.navigateTo({
      url: '/pages/search/search',
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
    // console.log("页面的下拉刷新")
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    // console.log("页面的上拉触底")
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage({ from }) {
    console.log(from)
    if (from === 'button') {
      return {
        title: '来自button的转发',
        page: '/pages/video/video',
        imageUrl: '/static/images/video/video.png'
      }
    } else {
      return {
        title: '来自menu的转发',
        page: '/pages/video/video',
        imageUrl: '/static/images/video/video.png'
      }
    }

  }
})