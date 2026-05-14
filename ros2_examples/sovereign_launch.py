from launch import LaunchDescription
from launch_ros.actions import Node

def generate_launch_description():
    return LaunchDescription([
        # Actuator Controller Node
        Node(
            package='sovereign_core',
            executable='actuator_controller.py',
            name='joint_ctrl',
            output='screen',
            parameters=[{'use_sim_time': True}]
        ),
        
        # Vision System Node
        Node(
            package='sovereign_vision',
            executable='camera_integration.py',
            name='vision_core',
            output='screen'
        ),
        
        # Static Transform (Example: Base to Camera)
        Node(
            package='tf2_ros',
            executable='static_transform_publisher',
            arguments=['0.1', '0', '0.2', '0', '0', '0', 'base_link', 'camera_link']
        )
    ])
