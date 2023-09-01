// let axios = require("axios")
// let md5 = require("md5");
// const { resolve } = require("path");

// const { resolve } = require("path");

// 所有用户cid和ak、姓名
// let carAk = [{
//         per_type: "无",
//         per_name: "晋BW2500",
//         ak: "5b46ef99bc9f373b3b1566dff2150205"
//     },
//     {
//         per_type: "无",
//         per_name: "晋BE2509",
//         ak: "08d4c1af22d9a7439ddfd05dd99c06ba"
//     },
//     {
//         per_type: "无",
//         per_name: "晋BV3628",
//         ak: "08d4c1af22d9a7439ddfd05dd99c06ba"
//     },
//     {
//         per_type: "无",
//         per_name: "晋BQ5828",
//         ak: "8431c5f387f8abf283c3f51274f43ec0"
//     },

// ]



function getAllCid() {
    return new Promise(resolve => {
        let url = "https://map.zhes.com.cn/api_get_cid.php";
        let data = {
            params: {
                apiKey: "66b52dc1475670f427b4919dea0e46c9",
                md5: "3017d911efceb27d1de6a92b70979795"
            }
        }
        axios.get(url, data).then(res => {
            // console.log(res.data)
            res = service(res)

            res.forEach(item => {
                addOtherProp(item, "cid", item.per_mgen_imei)
                let ak = md5(md5(item.cid) + md5("zhserver@2021"))
                addOtherProp(item, "ak", ak)
            })


            resolve(res)
        })
    })

}

function getCarInfo() {
    return new Promise(resolve => {
        let url = "https://cars.zhes.com.cn/api_get_car.php";
        let data = {
            params: {
                apiKey: "40938adf1e47a88c2409482f1206c656",
                md5: "3017d911efceb27d1de6a92b70979795"
            }
        }
        axios.get(url, data).then(res => {
            // console.log(res.data)
            res = service(res)

            res.forEach(item => {
                item.car_ovd.split(";").forEach(((tank, index) => {

                    if (index == 0) {
                        item.gasTankLength = tank.split(":")[1].split("mm")[0] / 100
                    }
                    if (index == 1) {
                        item.gasTankWidth = tank.split(":")[1].split("mm")[0] / 100
                    }
                    if (index == 0) {
                        item.gasTankHeigth = tank.split(":")[1].split("mm")[0] / 100
                    }

                }))

                addOtherProp(item, "cid", item.car_mgen_imei)
                addOtherProp(item, "car_name", item.car_num)
                addOtherProp(item, "car_type", item.car_job_type)
                addOtherProp(item, "car_volume", (item.gasTankLength * item.gasTankWidth).toFixed(2))
                addOtherProp(item, "car_Totalvolume", (item.car_volume * item.gasTankHeigth).toFixed(2))
                let ak = md5(md5(item.cid) + md5("zhserver@2021"))
                addOtherProp(item, "ak", ak)
            })

            resolve(res)
        })
    })
}

function getCarTrackInfo(ak, selDate, carInfoObj) {
    let day = selDate.split("-")[2]
    if (new Date(selDate) > new Date()) {
        carInfoObj[day + ""] = 0 + " (次)"
        carInfoObj["offLineDetail"] = "-"
        return
    }

    return new Promise(resolve => {
        let url = "https://cars.zhes.com.cn/api_get_work.php";
        let data = {
            params: {
                apiKey: "35c3d3d06770b2e2144e0471e499e201",
                ak,
                l: 1000,
                d: selDate
            }
        }
        axios.get(url, data).then(res => {
            console.log(res.data)
            res = service(res)
            let reverseArr = []
            res.forEach((item, index) => {

                    item.adtime = item.updateDate
                        // reverseArr.unshift(item)
                })
                // reverseArr[2030].s = 50
                // res = reverseArr




            let offLineArr = [];

            offLineArr = countOffLine(res)


            res.offlineCount = offLineArr.length

            carInfoObj.offlineCount = offLineArr.length

            res.offLineArr = offLineArr

            for (let prop in res) {
                if (prop <= 31) {
                    console.log("数组元素")
                } else {
                    carInfoObj[prop] = res[prop]
                }

            }

            console.log(offLineArr)
            carInfoObj[day + ""] = offLineArr.length + " (次)"
            carInfoObj["totalOff"] += offLineArr.length


            console.log(carInfoObj)
                // res.oilHeightGap = res[res.length - 1].oilHigh - res[0].oilHigh

            console.log(res)

            resolve(carInfoObj)
        })
    })
}

// 油耗
function getCarGasConsume(ak, selDate, carInfoObj) {
    let day = selDate.split("-")[2]
    if (new Date(selDate) > new Date()) {
        carInfoObj[day + ""] = "-"
        carInfoObj["offLineDetail"] = "-"
        return;

    }

    return new Promise(resolve => {
        let url = "https://cars.zhes.com.cn/api_get_work.php";
        let data = {
            params: {
                apiKey: "35c3d3d06770b2e2144e0471e499e201",
                ak,
                l: 100,
                d: selDate
            }
        }
        axios.get(url, data).then(res => {
            console.log(res.data)
            res = service(res)
            console.log(res)
            res.forEach((item, index) => {
                item.adtime = item.updateDate
            })


            console.log(carInfoObj)
            let height = getGasAccumulation(res)
            let dayConsume = (height * carInfoObj["car_volume"]).toFixed(2)
            carInfoObj[day + ""] = dayConsume + " L"

            carInfoObj["total"] = (parseFloat(carInfoObj["total"]) + parseFloat(dayConsume)).toFixed(2)
            resolve(carInfoObj)
        })
    })
}


function getGasAccumulation(res) {
    let consumeHeight = 0

    let initArr = []
    let oilHighArr = []
    res.forEach((item, index) => {
        if (!item.oilHigh) {
            consumeHeight += 0
        }
        // 油耗高度不为0时：initArr数组长度为0则入队，否则出队比较数值大小
        else {
            oilHighArr.push(item.oilHigh)
            if (initArr.length == 0) {
                initArr.push(item.oilHigh)
            } else {
                if (item.oilHigh - 0.6 > initArr[0]) {
                    consumeHeight += Math.abs(item.oilHigh - initArr[0])
                    initArr[0] = item.oilHigh
                } else {
                    initArr[0] = item.oilHigh
                }
            }

        }

    })
    console.log(oilHighArr)
        // alert(consumeHeight)
    return (consumeHeight / 100)
}
// 单个ak
function getPersonTrackInfo(ak, selMonth, day, personInfoObj) {
    console.log(`${ak}.${selMonth}.${day}`)
    return new Promise(resolve => {
        let url = "https://map.zhes.com.cn/work_cloud_api.php";
        let data = {
            params: {

                ak,
                d: selMonth.split("-")[0] + "-" + selMonth.split("-")[1],
                r: day,
                l: 2000
            }
        }

        axios.get(url, data).then(res => {

            res = res.data
                // console.log(res)

            let offLineArr = [];

            offLineArr = countOffLine(res)
            res.offlineCount = offLineArr.length

            personInfoObj.offlineCount = offLineArr.length

            res.offLineArr = offLineArr

            for (let prop in res) {
                if (prop <= 31) {
                    console.log("数组元素")
                } else {
                    personInfoObj[prop] = res[prop]
                }

            }

            console.log(offLineArr)
            personInfoObj[day + ""] = offLineArr.length + " (次)"
            personInfoObj["totalOff"] += offLineArr.length

            resolve(res)
        })
    })
}

// 单个员工出勤公里数，返回obj
function getPersonMonthMileage(personInfo, date) {
    return new Promise(resolve => {
        let url = "https://map.zhes.com.cn/api_get_work_date.php"
        let params = {
            apiKey: "70058befe64da880a9a9f13c0fcd9ea6",
            ak: personInfo.ak,
            d: date
        }
        axios.get(url, {
            params,
        }).then(res => {
            console.log(res.data)
            res = service(res)
            let totalMil = 0
            console.log(res)
            res.forEach((item) => {
                totalMil += parseFloat(item.kil)
            })
            totalMil = totalMil.toFixed(2)
            res = serveicArrToObj(res, date)
            addOtherProp(res, "ak", personInfo.ak)
            addOtherProp(res, "cid", personInfo.cid)
            addOtherProp(res, "per_name", personInfo.per_name)
            addOtherProp(res, "per_type", personInfo.per_type)

            addOtherProp(res, "totalMil", totalMil + "km")
                // console.log(res)
            resolve(res)

        })
    })
}

// 筛选条件下所有员工出勤公里数，返回arr
function getAllPersonMileage(personInfo, date) {
    // let akArr = ["fedb958e356843e74fd0f29174414347", "d037482d371b669384e549a92380c388"]
    let promiseArr = []
    return new Promise(resolve => {
        personInfo.forEach((obj) => {
            promiseArr.push(getPersonMonthMileage(obj, date))
        })



        Promise.all(promiseArr).then(resArr => {
            console.log(resArr)
            resolve(resArr)
        })
    })


}



// 单个车辆出勤公里数
function getCarMonthMileage(carInfo, selMonth) {
    return new Promise(resolve => {
        let url = "https://cars.zhes.com.cn/api_get_work_date.php"
        let params = {
            apiKey: "35c3d3d06770b2e2144e0471e499e201",
            ak: carInfo.ak,
            d: selMonth
        }
        axios.get(url, {
            params,
        }, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }).then(res => {
            console.log(res.data)
            res = service(res)
            console.log(res)
            let totalMil = 0





            res.forEach((item, index) => {
                totalMil += parseFloat(item.kil)
            })
            let totalDay = getAllDayByMonth(selMonth)
            totalMil = new Number(totalMil)
            totalMil = totalMil.toFixed(2)
            res = serveicArrToObj(res, selMonth)
            addOtherProp(res, "ak", carInfo.ak)
                // addOtherProp(res, "cid", carInfo.cid)
            addOtherProp(res, "car_name", carInfo.car_name)
            addOtherProp(res, "car_type", carInfo.car_type)

            addOtherProp(res, "totalMil", totalMil + "km")
                // console.log(res)
            resolve(res)


        })
    })
}

function initTabelDataByMark(selMonth) {
    let totalDay = getAllDayByMonth(selMonth);
    let res = []
    for (let i = 1; i <= totalDay; i++) {
        let day = addZeroByTen(i)
        let obj = {
            [selMonth + day]: "-"
        }
        res.push(obj)
    }
    return res

}
// 筛选条件下所有车辆出勤公里数，返回arr
function getAllCarMileage(personInfo, date) {
    // let akArr = ["fedb958e356843e74fd0f29174414347", "d037482d371b669384e549a92380c388"]
    let promiseArr = []
    return new Promise(resolve => {
        personInfo.forEach((obj) => {
            promiseArr.push(getCarMonthMileage(obj, date))
        })



        Promise.all(promiseArr).then(resArr => {
            console.log(resArr)
            resolve(resArr)
        })
    })
}

// 单个员工选定月份的打卡信息
function getVoiceData(cid, selMonth) {
    return new Promise(resolve => {
        let url = "https://map.zhes.com.cn/api_voc_data.php"
        let data = {
            apiKey: "bc381ad39663b2afd6cf3edf0883914b",
            ak: cid,
            d: selMonth
        }
        axios.post(url, data, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }).then(res => {

            res = service(res)
                // console.log(res)
            resolve(res)

        })
    })
}

// 判断某天打卡是否异常: 
//  0 ：打卡无异常
//  1.1 ：未绑定设备
//  1.2 ：未来时间（显示-）
//  2.1 ：上班代打卡， 
//  2.2 ：下班代打卡， 
//  3.1 ：上班缺卡一次， 
//  3.2 ：下班缺卡一次， 
//  4 ：上班下班缺卡
//  5 ：上班下班代打卡
// 6.1: 上班代打卡，下班缺卡
// 6.2: 上班缺卡，下班代打卡
function judgeIsAbnormalVoic(VoiceDateArr, date) {
    //若选择时间为未来时间打卡无异常
    let curTime = new Date()
    let selDate = new Date(date)
    if (selDate > curTime) {
        return 1.2
    }

    let validVoic = {
        [date]: []
    }
    let fakeVoic = {
        [date]: []
    }
    VoiceDateArr.forEach((item) => {
            if (!item.addtime) {
                return 1
            }
            if (item.addtime.split(" ")[0] == date && item.nums > 0.4) {
                validVoic[date].push(item)
            } else if (item.addtime.split(" ")[0] == date && item.nums <= 0.4) {
                fakeVoic[date].push(item)
            }

        })
        // console.log("有效数据")
        // console.log(validVoic[date])
        // console.log("代打卡效数据")
        // console.log(fakeVoic[date])

    if (validVoic[date].length >= 2) {
        let lastVoicTime = getTimeObj(validVoic[date][0].addtime)
        let firstVoicTime = getTimeObj(validVoic[date][validVoic[date].length - 1].addtime)
        if (lastVoicTime.hh - firstVoicTime.hh > 6) {
            // 打卡无异常
            return 0
        } else {
            // 工作小于六小时判断为下班缺卡
            return 3.2
        }
    } else if (validVoic[date].length == 1) {
        // 只打上班卡，无代打卡判断为下班缺卡
        let validTimeObj = getTimeObj(validVoic[date][0].addtime)

        if (fakeVoic[date].length == 0 && validTimeObj.hh < 12) {
            return 3.2;
        } else if (fakeVoic[date].length == 0 && validTimeObj.hh >= 12) {
            return 3.1
        } else if (fakeVoic[date].length >= 1) {
            let fakeTimeObj = getTimeObj(fakeVoic[date][0].addtime)
            if (fakeTimeObj.hh < 12 && validTimeObj.hh >= 12) {
                return 2.1
            } else if (fakeTimeObj.hh >= 12 && validTimeObj.hh < 12) {
                return 2.2
            } else if (validTimeObj.hh < 12) {
                return 3.2
            } else {
                console.log("162:" + validTimeObj.hh)
                return 3.1
            }
        }

    } else {
        if (fakeVoic[date].length == 0) {
            return 4
        } else if (fakeVoic[date].length == 1) {
            let fakeTimeObj = getTimeObj(fakeVoic[date][0].addtime)
            if (fakeTimeObj.hh < 12) {
                return 6.1
            } else {
                return 6.2
            }
        } else {
            let endfakeTimeObj = getTimeObj(fakeVoic[date][0].addtime)
            let FirstfakeTimeObj = getTimeObj(fakeVoic[date][fakeVoic[date].length - 1].addtime)
            if (endfakeTimeObj.hh - FirstfakeTimeObj > 6) {
                return 5;
            } else if (endfakeTimeObj.hh < 12) {
                return 6.1
            } else {
                return 6.2
            }

        }
    }

}
// 以下res、info用于测试function judgeIsAbnormalVoic
// let res = [{
//         addtime: '2023-05-02 19:31:41',
//         nums: 0.3
//     },
//     {
//         addtime: '2023-05-02 12:31:41',
//         nums: 0.6
//     },
// ]
// let info = judgeIsAbnormalVoic(res, "2023-05-02")
// console.log("当日考勤")
// console.log(info)

// 通过异常信息统计异常打卡次数
function countAbnormalTimes(judgeInfo) {
    switch (judgeInfo) {
        case 0:
            judgeInfo = "正常上班"
            return 0;
        case 1:
            judgeInfo = "未绑定设备"
            return 0;
        case 1.2:
            judgeInfo = "未来时间"
            return 0;
        case 2.1:
            judgeInfo = "上班代打卡"
            return 1;
        case 2.2:
            judgeInfo = "下班代打卡"
            return 1;
        case 3.1:
            judgeInfo = "上班缺卡"
            return 1;
        case 3.2:
            judgeInfo = "下班缺卡"
            return 1;
        case 4:
            judgeInfo = "上、下班缺卡"
            return 2;
        case 5:
            judgeInfo = "上、下班代打卡"
            return 2;
        case 6.1:
            judgeInfo = "上班代打卡、下班缺卡"
            return 2;
        case 6.2:
            judgeInfo = "上班缺卡、下班代打卡"
            return 2;
    }
}

// 单个人员月出勤信息表
function getCidMonthAttend(cid, selMonth, per_name, per_type) {
    return new Promise(resolve => {
        getVoiceData(cid, selMonth).then(res => {
            console.log(res)
            let attendObj = {}
            let abnormalCount = 0
            attendObj.selMonth = selMonth
            let totalDay = getAllDayByMonth(selMonth)
            for (let i = 1; i <= totalDay; i++) {
                if (i < 10) {
                    i = '0' + i
                }
                let attendDate = selMonth + "-" + i
                let info = judgeIsAbnormalVoic(res, attendDate)
                abnormalCount += countAbnormalTimes(info)
                switch (info) {
                    case 0:
                        info = "正常上班"
                        break;
                    case 1.1:
                        info = "未绑定设备"
                        break;
                    case 1.2:
                        info = "-"
                        break;
                    case 2.1:
                        info = "上班代打卡"
                        break;
                    case 2.2:
                        info = "下班代打卡"
                        break;
                    case 3.1:
                        info = "上班缺卡"
                        break;
                    case 3.2:
                        info = "下班缺卡"
                        break;
                    case 4:
                        info = "上、下班缺卡"
                        break;
                    case 5:
                        info = "上、下班代打卡"
                        break;
                    case 6.1:
                        info = "上班代打卡、下班缺卡"
                        break;
                    case 6.2:
                        info = "上班缺卡、下班代打卡"
                        break;
                }
                attendObj[i] = info

            }
            attendObj.per_name = per_name
            attendObj.per_type = per_type
            attendObj.abnormalCount = abnormalCount

            console.log(`${per_name}当月考勤`)
            console.log(attendObj)
            resolve(attendObj)
        })
    })

}

// 筛选条件后的所有人员月出勤信息表
function getAllCidMonthAttend(personInfoArr, selMonth) {
    let reqPromise = []
    return new Promise(resolve => {
        personInfoArr.forEach((item) => {
            console.log(item.cid)
            reqPromise.push(getCidMonthAttend(item.cid, selMonth, item.per_name, item.per_type))
        })
        Promise.all(reqPromise).then(res => {
            console.log(res)

            resolve(res)
        })
    })

}

// getCidMonthAttend("82706581279", "2023-04")
// getAllCid().then(res => {
//     res = res.slice(0, 5)

//     getAllCidMonthAttend(res, "2023-05")
// })

// 逻辑层、数据处理层
function service(res) {
    // res为响应头，res.data为相应体
    if (!res.data) return []

    res = res.data


    var str_begin = res.indexOf('[')
    var str_end = res.lastIndexOf(']')
    res = res.substr(str_begin, str_end)

    if (res.includes("error")) return []
    try {
        res = JSON.parse(res);
    } catch (e) {
        res = []
    }
    return res
}

function serveicArrToObj(arr, date) {
    let obj = {}
    arr.forEach((item) => {
        let haoNum = item.date.split('-')[2]
        haoNum = numbRemoveZero(haoNum)

        let num = new Number(item.kil)
        num = num.toFixed(2)

        obj[haoNum] = num + "km"
        addOtherProp(obj, "date", date)

    })
    return obj
}

// 统计离线时间
function countOffLine(res) {

    let offArr = []
    let offLineArr = []
    let offTimeSpanArr = []
    let offLineDetail = "-"
    let offLineTotalTime = 0
    for (let i = res.length - 1; i >= 0; i--) {

        if (parseInt(res[i].s) == 0 && offArr.length == 0) {
            offArr.push(res[i])
            console.log("铺货到0")
        }
        if (parseInt(res[i].s) != 0 && offArr.length != 0) {

            let lastOffTime = new Date(res[i].adtime)
            let firstOffTime = new Date(offArr[0].adtime)

            let offDuration = getTimeGap(firstOffTime, lastOffTime)

            offArr = []
            if (offDuration > 5) {
                if (offLineDetail == "-") {
                    offLineDetail = ""
                }
                offLineTotalTime += parseInt(offDuration)
                offLineArr.push(offDuration)
                let firstOffTimeDay = addZeroByTen(firstOffTime.getDate())
                let firstOffTimeHour = addZeroByTen(firstOffTime.getHours())
                let firstOffTimeMin = addZeroByTen(firstOffTime.getMinutes())
                let lastOffTimeDay = addZeroByTen(lastOffTime.getDate())
                let lastOffTimeHour = addZeroByTen(lastOffTime.getHours())
                let lastOffTimeMin = addZeroByTen(lastOffTime.getMinutes())

                offTimeSpanArr.push(firstOffTimeHour + ":" + firstOffTimeMin + "-" + lastOffTimeHour + ":" + lastOffTimeMin)
                offLineDetail += offTimeSpanArr[offTimeSpanArr.length - 1] + `:共${offDuration}分钟 ` + "; "
            }

        }
    }
    res["offTimeSpanArr"] = offTimeSpanArr
    res["offLineTotalTime"] = offLineTotalTime + "分钟"
    res["offLineDetail"] = offLineDetail
    res["offLineArr"] = offLineArr
    res["offLineTimes"] = offLineArr.length
    return offLineArr
}
// 得到两个时间差，返回分钟
function getTimeGap(startTimeStr, endTimeStr) {
    let lastTime = new Date(endTimeStr)
    let firstTime = new Date(startTimeStr)

    return ((lastTime.getTime() - firstTime.getTime()) / 1000 / 60).toFixed(0)
}


function addOtherProp(obj, propName, value) {
    obj[propName] = value
}

function numbRemoveZero(num) {
    if (num < 10) {
        num = parseInt(num);

    }
    return num
}
// 根据日期返回当天总天数
function getAllDayByMonth(selDate) {
    selDate = new Date(selDate)
    let total = 0;
    for (let i = 28; i++; i < 32) {
        selDate.setDate(i)
        let day = selDate.getDate()
        if (day == 1) {
            total = i - 1;
            break;
        }
    }
    console.log(total)

    return total;
}

//根据日期时间 yyyy-mm-dd hh:mm:ss 24h格式返回时间对象
function getTimeObj(timeStr) {
    let date = timeStr.split(' ')[0]
    let time = timeStr.split(' ')[1]

    let y = date.split('-')[0]
    let m = date.split('-')[1]
    let d = date.split('-')[2]

    let hh = time.split(":")[0]
    let mm = time.split(":")[1]
    let ss = time.split(":")[2]

    let timeObj = {
        y,
        m,
        d,
        hh,
        mm,
        ss,
    }

    return timeObj
        // console.log(timeObj)   
}

function addZeroByTen(num) {
    if (num < 10) {
        num = "0" + num
    }
    return num;
}

// getTimeObj('2023-05-01 19:29:45')