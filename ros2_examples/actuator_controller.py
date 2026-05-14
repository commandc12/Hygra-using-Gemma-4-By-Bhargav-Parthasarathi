import rclpy
from rclpy.node import Node
from std_msgs.msg import Float64, Bool
import time

class SovereignJointController(Node):
    def __init__(self):
        super().__init__('sovereign_joint_controller')
        
        # State
        self.emergency_stop_active = False
        self.target_position = 0.0
        
        # Publishers & Subscribers
        self.cmd_pub = self.create_publisher(Float64, '/sovereign/joint_command', 10)
        self.stop_sub = self.create_subscription(Bool, '/sovereign/emergency_stop', self.stop_callback, 10)
        self.target_sub = self.create_subscription(Float64, '/sovereign/target_pos', self.target_callback, 10)
        
        # Timer for control loop (50Hz)
        self.timer = self.create_timer(0.02, self.control_loop)
        
        self.get_logger().info('Sovereign Joint Controller Initialized.')

    def stop_callback(self, msg):
        if msg.data:
            self.get_logger().error('EMERGENCY STOP TRIGGERED!')
            self.emergency_stop_active = True
        else:
            self.emergency_stop_active = False

    def target_callback(self, msg):
        if not self.emergency_stop_active:
            self.target_position = msg.data

    def control_loop(self):
        msg = Float64()
        if self.emergency_stop_active:
            msg.data = 0.0  # Force zero velocity/torque
        else:
            msg.data = self.target_position
            
        self.cmd_pub.publish(msg)

def main(args=None):
    rclpy.init(args=args)
    node = SovereignJointController()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
