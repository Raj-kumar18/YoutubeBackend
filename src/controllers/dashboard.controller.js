import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const userId = req.user._id
    if (!userId) {
        throw new ApiError(400, "User ID is required")
    }

    const videoCount = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group: {
                _id: "$videoFile",
                totalViews: {
                    $sum: "$views"
                },
                totalVideos: {
                    $sum: 1,
                }
            }
        },
        {
            $project: {
                _id: 0,
                totalViews: 1,
                totalVideos: 1
            }
        }
    ])

    const subscriberCount = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(userId)
            }
        }, {
            $group: {
                _id: "$channel",
                totalSubscribers: {
                    $sum: 1
                }
            }
        },
        {
            $project: {
                _id: 0,
                totalSubscribers: 1
            }
        }
    ])

    const likeCount = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId)
            }
        }, {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoInfo"
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "comment",
                foreignField: "_id",
                as: "commentInfo"
            }
        }, {
            $lookup: {
                from: "tweets",
                localField: "tweet",
                foreignField: "_id",
                as: "tweetInfo"
            }
        },
        {
            $match: {
                $or: [
                    {
                        "videoInfo.owner": new mongoose.Types.ObjectId(userId)
                    },
                    {
                        "commentInfo.owner": new mongoose.Types.ObjectId(userId)
                    },
                    {
                        "tweetInfo.owner": new mongoose.Types.ObjectId(userId)
                    },
                ]
            }
        },
        {
            $group: {
                _id: "$likedBy",
                totalLikes: {
                    $sum: 1
                }
            }
        },
        {
            $project: {
                _id: 0,
                totalLikes: 1
            }
        }
    ])

    const info = {
        totalVidews: videoCount[0]?.totalViews || 0,
        totalVideos: videoCount[0]?.totalVideos || 0,
        totalSubscribers: subscriberCount[0]?.totalSubscribers || 0,
        totalLikes: likeCount[0]?.totalLikes || 0
    }

    return res.status(200).json(new ApiResponse(
        200,
        info,
        "Channel stats fetched successfully",
    ))

})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const userId = req.user._id
    if(!userId){
        throw new ApiError(400, "User ID is required")
    }

    const videos = await Video.find({ owner: userId })

    return res.status(200).json(new ApiResponse(
        200,
        videos,
        "Channel videos fetched successfully",
    ))
})

export {
    getChannelStats,
    getChannelVideos
}