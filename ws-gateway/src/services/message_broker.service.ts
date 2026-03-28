import amqp, { ChannelModel } from "amqplib";

export let channel: amqp.Channel;
export let connection: ChannelModel;

const createChannel = async () => {
    try {
        connection = await amqp.connect(process.env.RABBIT_URL!);
        channel = await connection.createChannel();
        return channel;
    } catch (error) {
        console.error("error in creating message broker channel", error)
        throw error;
    }
}

export { createChannel as default, createChannel };