import request from "../../../utils/request";
import PubSub from 'pubsub-js'
import moment, { duration } from 'moment'

// 获取全局实例
const appInstance = getApp()
// pages/songDetail/songDetail.js

Page({

  /**
   * 页面的初始数据
   */
  data: {
    isPlay: false, // 标识音乐是否播放
    song: {}, // 歌曲详情对象
    musicId: '', // 音乐id
    musicLink: '', // 音乐的链接
    currentTime: '00:00', // 实时时间
    durationTime: '00:00', // 总时长
    startTime: 0, //滑块起始时长
    endTime: 0, //滑块结束时长
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // options: 用于接收路由跳转的query参数
    // 原生小程序中路由传参, 对参数的长度有限制, 如果参数长度过长会自动截取掉

    let musicId = options.musicId
    this.setData({
      musicId
    })
    this.getMusicInfo(musicId)

    /**
    * 问题: 如果用户操作系统的控制音乐播放/暂停的按钮, 页面不知道, 导致页面显示是否播放的状态
    * 和真实的音乐播放状态不一致
    * 解决方案: 
    *  1. 通过控制音频的实例 backgroundAudioManager 去监视音乐播放/暂停
    */

    // 判断当前页面音乐是否在播放
    if (appInstance.globalData.isMusicPlay && appInstance.globalData.musicId === musicId) {
      // 修改当前页面音乐播放状态为true
      this.setData({
        isPlay: true
      })
    }

    // 创建控制音乐播放的实例
    this.backgroundAudioManager = wx.getBackgroundAudioManager()

    // 监视音乐播放/暂停
    this.backgroundAudioManager.onPlay(() => {
      // 修改音乐是否播放
      this.changePlayState(true);
      appInstance.globalData.musicId = musicId;
    })
    this.backgroundAudioManager.onPause(() => {
      // 修改音乐是否暂停
      this.changePlayState(false);
    })
    this.backgroundAudioManager.onStop(() => {
      // 修改音乐是否停止(真机上才有这个效果)
      this.changePlayState(false);
    })
    // 监听音乐播放自动结束
    this.backgroundAudioManager.onEnded(() => {
      // 关闭当前的音乐
      this.backgroundAudioManager.stop()

      // 将实时进度条的长度还原成 0, 实时时间还原成 0
      this.setData({
        startTime: 0,
        currentTime: '00:00'
      })

      // 自动切换至下一首音乐, 并且自动播放
      PubSub.publish('switchType', 'next')

      // 订阅来自recommendSong页面发送的musicId
      PubSub.subscribe('musicId', (msg, musicId) => {
        // console.log(musicId)

        // 获取音乐的详情信息
        this.getMusicInfo(musicId)
        // 自动播放当前的音乐
        this.musicControl(true, musicId)
        // 取消订阅
        PubSub.unsubscribe('musicId')

      })

    })



    // 监听音乐实时播放的进度
    this.backgroundAudioManager.onTimeUpdate(() => {
      // 格式化实时的播放时间
      let currentTime = moment(this.backgroundAudioManager.currentTime * 1000).format('mm:ss')
      let currentWidth = this.backgroundAudioManager.currentTime / this.backgroundAudioManager.duration * 450
      let startTime = this.backgroundAudioManager.currentTime //实时时长
      let endTime = this.backgroundAudioManager.duration //总时长

      // 解决播放结束时因为currentWidth为null导致进度条拉满的bug
      if (currentWidth) {
        this.setData({
          currentTime,
          currentWidth,
          startTime,
          endTime
        })
      } else {
        return
      }
    })

  },

  // 修改播放状态的功能函数
  changePlayState(isPlay) {
    // 修改音乐的状态
    this.setData({
      isPlay
    })

    // 修改全局音乐播放的状态
    appInstance.globalData.isMusicPlay = isPlay;
  },

  // 获取音乐详情的功能函数
  async getMusicInfo(musicId) {
    let songData = await request('/song/detail', { ids: musicId })
    // songData.songs[0].dt 单位ms

    let durationTime = moment(songData.songs[0].dt).format('mm:ss')

    this.setData({
      song: songData.songs[0],
      durationTime
    })

    // 动态修改窗口标题
    wx.setNavigationBarTitle({
      title: this.data.song.name,
    })
  },

  // 点击播放/暂停的回调
  handleMusicPlay() {
    let isPlay = !this.data.isPlay;
    // // 修改是否播放的状态
    // this.setData({
    //   isPlay
    // })

    let { musicId, musicLink } = this.data

    this.musicControl(isPlay, musicId, musicLink);
  },

  // 控制音乐播放/暂停的功能函数
  async musicControl(isPlay, musicId, musicLink) {

    if (isPlay) { //音乐播放
      if (!musicLink) {
        // 获取音乐播放的链接
        let musicLinkData = await request('/song/url', { id: musicId })
        musicLink = musicLinkData.data[0].url

        this.setData({
          musicLink
        })
      }

      // 创建控制音乐播放的实例
      this.backgroundAudioManager.title = this.data.song.name
      this.backgroundAudioManager.src = this.data.musicLink
    } else { //暂停音乐
      this.backgroundAudioManager.pause()
    }
  },

  // 点击切歌的回调
  handleSwitch(event) {
    // 获取切歌的类型
    let type = event.currentTarget.id;

    // 关闭当前的音乐
    this.backgroundAudioManager.stop()
    // 订阅来自recommendSong页面发送的musicId
    PubSub.subscribe('musicId', (msg, musicId) => {
      // console.log(musicId)

      // 获取音乐的详情信息
      this.getMusicInfo(musicId)
      // 自动播放当前的音乐
      this.musicControl(true, musicId)
      // 取消订阅
      PubSub.unsubscribe('musicId')
    })

    // 发布消息数据给recommendSong页面
    PubSub.publish('switchType', type)
  },

  // 拖动进度条的回调
  handleMove(event) {
    let value = event.detail.value
    this.setData({
      startTime: value
    })
    this.backgroundAudioManager.seek(value)
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