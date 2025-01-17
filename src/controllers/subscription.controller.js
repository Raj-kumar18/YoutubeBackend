import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    // Validate the channel ID
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id");
    }

    // Check if the channel exists
    const channel = await User.findById(channelId);
    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    // Check if a subscription exists
    const subscription = await Subscription.findOne({
        subscriber: req.user._id,
        channel: channelId,
    });

    if (subscription) {
        // Unsubscribe: delete the existing subscription
        await Subscription.findByIdAndDelete(subscription._id);
        res.status(200).json({
            success: true,
            message: "Unsubscribed successfully",
            data: {},
        });
    } else {
        // Subscribe: create a new subscription
        await Subscription.create({
            subscriber: req.user._id,
            channel: channelId,
        });
        res.status(200).json({
            success: true,
            message: "Subscribed successfully",
            data: {},
        });
    }

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid channel Id")
    }
    const subscriberList = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }

        },
        {
            $addFields: {
                subscriber: {
                    $first: "$subscriber"
                }
            }
        }, {
            $project: {
                subscriber: 1,
                createdAt: 1
            }
        }
    ])
    if (!subscriberList) {
        throw new ApiError(404, "Subscribers not found")
    }

    res.status(200).json({
        success: true,
        message: "Subscribers fetched successfully",
        data: subscriberList
    })


})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    console.log(channelId);
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid subscriber Id")
    }
    const channelList = await Subscription.aggregate([
        {
            $match: {
                subscriber: channelId
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                channel: {
                    $first: "$channel"
                }
            }
        },
        {
            $project: {
                channel: 1,
                createdAt: 1
            }
        }
    ])
    if (!channelList) {
        throw new ApiError(404, "Channels not found")
    }
    res.status(200).json({
        success: true,
        message: "Channels fetched successfully",
        data: channelList
    })
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}