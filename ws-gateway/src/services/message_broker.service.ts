import amqp from "amqplib";

export let channel: amqp.Channel;

const createChannel = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBIT_URL!);
        channel = await connection.createChannel();
        return channel;
    } catch (error) {
        console.error("error in creating message broker channel", error)
        throw error;
    }
}

export default createChannel;