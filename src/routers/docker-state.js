import express from 'express';
import util from 'util';
import { exec } from 'child_process';
import dotenv from 'dotenv';

dotenv.config()
const SSH_KEY = process.env.SSH_KEY;

const asyncExec = util.promisify(exec);
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { container, state } = req.body;

    if (!['worker1', 'worker2', 'worker3'].includes(container)) {
      return res.status(404).json({ success: false, message: `container with ${container} name not found` });
    }

    if (!['start', 'stop', 'restart'].includes(state)) {
      return res.status(400).json({ success: false, message: 'state only support [ start | stop | restart ]' });
    }

    const { stderr } = await asyncExec(`ssh -i ${SSH_KEY} ec2-user@18.141.234.81 docker ${state} ${container}`);
    if (stderr) return res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });

    return res.status(200).json({
      success: true,
      message: `set container ${container} to ${state} success`
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
});

export default router;
