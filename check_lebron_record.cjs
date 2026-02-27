const fs = require('fs');
const buffer = fs.readFileSync('tutorial.zip'); // Wait, the roster file is .ROS. I need to find the .ROS filename.
// I'll check list_dir output from earlier or common names.
// From previous summary: "Load NBA Year 2013-14.ROS"
// I don't see it in the list_dir of the current directory.
// Ah, the user might have it in "rostra" folder.
