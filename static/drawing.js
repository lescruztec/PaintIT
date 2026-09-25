// domccontentloaded learned from web50
document.addEventListener("DOMContentLoaded", function () {
    console.log('woring js')
    // canvas' functions from: https://www.w3schools.com/graphics/canvas_intro.asp, duck, gpt, and some other sites
    let canvas = document.querySelector('#canvas');
    const canvas_view = document.querySelector("#canvas-view");
    console.log(canvas)
    let ctx = canvas.getContext("2d");
    // set default zoom level to 1 or normal
    let zoom = 1;
    // declare empty list to use as stack for later use in undo and redo functions
    let strokes_stack = []
    let redo_stack = []
    // adjust canvas size to user's chosen resolution
    resize_canvas()
    // retrieve image loaded from database
    const image = document.querySelector("#image_placeholder");
    // if there is any, draw it on canvas, https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Using_images, 
    // rather than creating the image here in javascript, it is created when the template loads 
    if (image){
        console.log('loaded')
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    }
    let drawing = false;
    let current_stroke = null;
    // set brush settings
    let type = "brush"
    ctx.strokeStyle = "black";
    ctx.lineWidth = 5;

  
    window.addEventListener("resize", resize_canvas)
    // resizes canvas based on chosen resolution and zoom factor or level
    function resize_canvas(){
        /* 
            logic adjusted and taken from: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
            adjusted so that canvas-view div was referenced instead of the window object 
            and for the css of canvas itself to be adjusted instead of canvas-view(#stage in the referenced page)
            chatgpt and duck also really helped, mostly duck
        */
        // 
        const scaleX = canvas_view.clientWidth / canvas.width;
        const scaleY = canvas_view.clientHeight / canvas.height;
        // chooses which resolution can fit inside canvas-view div
        const view_fit = Math.min(scaleX, scaleY);
        // adjust new css resolution based on zoom level
        const scale = view_fit * zoom;
        // fit canvas into canvas-view
        canvas.style.width = `${canvas.width * scale}px`;
        canvas.style.height = `${canvas.height * scale}px`;
    }
    
    document.querySelector("#zoom-in").addEventListener("click", function () {
        zoom *= 1.2;
        zoom_amount = (zoom * 100)
        document.querySelector("#zoom-amount").innerHTML = `${zoom_amount.toFixed(2)}%`;
        resize_canvas();
    });

    document.querySelector("#zoom-out").addEventListener("click", function () {
        zoom /= 1.2;
        zoom_amount = (zoom * 100)
        document.querySelector("#zoom-amount").innerHTML = `${zoom_amount.toFixed(2)}%`;
        resize_canvas();
    });

    // detects scroll of mouse, used duck for this
    document.addEventListener("wheel", function(event){ 
        event.preventDefault();
        // zoom
        if (event.ctrlKey)
        {
            // deltaY detects user scroll amount, positive value == scroll down (zoom out) and negative == scroll up (zoom in)
            if (event.deltaY < 0) {
                
                zoom_mouse(event, 1.2);
                zoom_amount = (zoom * 100)
                document.querySelector("#zoom-amount").innerHTML = `${zoom_amount.toFixed(2)}%`;
            } 
            else if (event.deltaY > 0) {
                zoom_mouse(event, 1 / 1.2);
                zoom_amount = (zoom * 100)
                document.querySelector("#zoom-amount").innerHTML = `${zoom_amount.toFixed(2)}%`;
            }
          
        }
        // scroll when applicable, really only when canvas is zoomed in
        if (event.shiftKey) {
            event.preventDefault();
            canvas_view.scrollLeft += event.deltaY;
            return;
        }
    }, { passive: false }); 

    document.addEventListener("keydown", function(event){
        // zoom
        if (event.ctrlKey){
            if (event.key == "=" || event.key == "+"){
                event.preventDefault();
                
                zoom_mouse(event, 1.2);
                zoom_amount = (zoom * 100)
                document.querySelector("#zoom-amount").innerHTML = `${zoom_amount.toFixed(2)}%`;
                console.log("zoom in works")
            }
            else if (event.key == "-"){
                event.preventDefault();
                zoom_mouse(event, 1/1.2);
                    zoom_amount = (zoom * 100)
                document.querySelector("#zoom-amount").innerHTML = `${zoom_amount.toFixed(2)}%`;
                console.log("zoom out works")
            }
        }
        let scrollAmount = 50
        // scroll (used duck for the syntax)
        if (event.shiftKey){
            key = event.key.toLowerCase()
            if (key == "a" || key == "arrowleft"){
                canvas_view.scrollLeft -= scrollAmount;
            }
            else if (key == "d" || key == "arrowright"){
                canvas_view.scrollLeft += scrollAmount;
            }
            if (key == "w" || key == "arrowup"){
                canvas_view.scrollTop -= scrollAmount;
            }
            if (key == "s" || key == "arrowdown"){
                canvas_view.scrollTop += scrollAmount;
            }
        }
    }, { passive: false }); // suggested by duck

     // convert mouse points(coordinates) to fit back into the chosen resolution, used chatgpt and duck
    function getCanvasPoint(event) {
        // identify position of canvas relative to the browser https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect
        const rect = canvas.getBoundingClientRect();
        return {
            // subtract mouse pointer - distance of canvas from the browser, the leftover values indicates where the mouse pointer will be if the canvas and the browser were the same size
            // multiply the result to the ration of the internal canvas/css canvas. basically the the mouse pointer now matches with the css display, but you must
            // multiply it to scale it back into the original resolution, otherwise, you're drawing at a point in the css display, but that wouldn't match at the real drawing or resolution
            x: (event.clientX - rect.left) * canvas.width / rect.width,
            y: (event.clientY - rect.top) * canvas.height / rect.height
        };
    }
    // allows zooming in at where the mouse pointer currently is , got help from chatgpt
    function zoom_mouse(event, zoom_factor) {
        const rect = canvas.getBoundingClientRect();
        // mouse position inside the canvas BEFORE zoom
        const mouse_x = event.clientX - rect.left;
        const mouse_y = event.clientY - rect.top;

        console.log(`mouse_x = ${mouse_x} AND mouse_y = ${mouse_y}`)
        // multiply current zoom to new receivved zoom factor
        zoom *= zoom_factor;
        // adjust canvas based on new zoom 
        resize_canvas();

        // how much farther from the canvas origin the mouse point is after zooming
        const new_mouse_x = mouse_x * zoom_factor;
        const new_mouse_y = mouse_y * zoom_factor;
        console.log(`newmouse_x = ${new_mouse_x} AND newmouse_y = ${new_mouse_y}`)
        // move the scroll position to compensate
        canvas_view.scrollLeft += new_mouse_x - mouse_x;
        canvas_view.scrollTop += new_mouse_y - mouse_y;
    }

    // changes brush color 
    document.querySelector("#brush-colors").addEventListener("change", function (event) {
        ctx.strokeStyle = event.target.value;
        ctx.globalCompositeOperation = "source-over"
        console.log(`dasdsa`)
        type = "brush";
    })

    document.querySelector("#file").addEventListener("change", function (event) {
        let selected = event.target.value
        if (selected){
            // download logic learned from: https://dev.to/smpnjn/how-to-save-html-canvas-as-an-image-38dh?comments_sort=top
            if (selected == 'Save_Transparent'){
                // download as is
                // dataurl: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toDataURL 
                let canvas_url = canvas.toDataURL();
                let button = document.createElement('a');
                button.href = canvas_url;
                button.download = "download-this-canvas";
                console.log(`${canvas_url} AND ${button}`)
                button.click()
                button.remove()
            }
            else if (selected == 'Save_White'){
                // create new white canvas and slap existing canvas on top of it
                const temp_canvas = document.createElement("canvas");
                temp_canvas.height = canvas.height;
                temp_canvas.width = canvas.width;

                temp_ctx = temp_canvas.getContext("2d");
                temp_ctx.fillStyle = "white";
                temp_ctx.fillRect(0, 0, temp_canvas.width, temp_canvas.height);
                temp_ctx.drawImage(canvas, 0, 0);
                
                let canvas_url = temp_canvas.toDataURL("");
                let button = document.createElement('a');
                button.href = canvas_url;
                button.download = "download-this-canvas";
                console.log(`${canvas_url} AND ${button}`)
                button.click()
                button.remove()

            }
            else if (selected == 'Save_Account'){
                // javascript fetch request learned from: https://cs50.harvard.edu/web/projects/3/mail/ (many techniques from web50 was applied because I'm currently taking it, haven't uploaded my projects yet tho )
                fetch('/save_to_account', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'}, // enable json fetch request (saw this with duck, since I didnt see this in web50 )
                // 
                body: JSON.stringify({
                    drawing_id: document.querySelector('#drawing_id').dataset.drawing,
                    /* 
                    image is encoded as dataURL with base64 format, 

                    learned from: https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/data 
                    will be decoded later on the server
                    also asked help with duck and chatgpt in understanding dataurl
                    */
                    image: canvas.toDataURL("image/png")
                })
                })
                .then(response => response.json())
                .then(result => {
                    //trigger html alert to alert user regarding save result
                    console.log(result);
                    alert(`${result.message}`)
                })
                .catch(error => {
                    console.log(error);
                });

            }
            document.querySelector("#file").value = "File"
        }
    })
    // changes brush size
    document.querySelector("#brush-size").addEventListener("change", function (event) {
        value = Number(event.target.value)
        if (value && value > 0){
            ctx.lineWidth = value
        }
    })
    // triggers undo and redo when clicked
    document.querySelector('#Undo').onclick = function (event) {
        undo(event)
    }
    document.querySelector('#Redo').onclick = function (event) {
        redo(event)
    }
    // destination-out allows erasure due to transparent stroke on canvas : https://www.w3schools.com/TAGs/playcanvas.php?filename=playcanvas_globalcompop&preval=destination-out
    document.querySelector('#eraser').onclick = function () {
        ctx.globalCompositeOperation = "destination-out";
        type = "eraser";
        console.log(ctx.globalCompositeOperation)
        console.log(type)
    }
    document.querySelector('#brush').onclick = function () {
        ctx.globalCompositeOperation = "source-over";
        type = "brush";
        console.log(ctx.globalCompositeOperation)
    }

    document.addEventListener("keydown", function(event){
        if (event.ctrlKey){
            if (event.key == "z"){
                undo(event)
            }
            else if (event.key == "y"){
                redo(event)
            }
        }
    })

    canvas.addEventListener("mousedown", function (event) {
        // allows stroke to start
        drawing = true;
        // retrieve accurate location of mouse in canvas
        coord = getCanvasPoint(event)
        // start of stroke, save current point under stroke to current_stroke, which will add up to a whole stroke later
        current_stroke = {
            type: type,
            color: ctx.strokeStyle,
            size: ctx.lineWidth,
            points: [{x: coord.x, y:coord.y}]
        };
        ctx.beginPath();
        ctx.moveTo(coord.x,coord.y);
    });


    // continue the current stroke
    canvas.addEventListener("mousemove", function (event) {
        if (!drawing) {
            return;
        }
        // retrieve accurate location of mouse in canvas
        coord = getCanvasPoint(event)
        const x = coord.x;
        const y = coord.y;

        // save point to current ongoing stroke and draw on canvas
        current_stroke.points.push({x: x,y: y});
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    });

    // stop drawing if mouse is uncllicked
    canvas.addEventListener("mouseup", function () {
        finish_stroke()
    });


    // stop drawing if mouse pointer leaves canvas
    canvas.addEventListener("mouseleave", function () {
        finish_stroke()
    });

    function finish_stroke(){
        if (!drawing) {
            return;
        }
        drawing = false;
        // save to strokes for later use
        strokes_stack.push(current_stroke);
        // reset redo and current stroke
        redo_stack = [];
        current_stroke = null;
    }

    function drawStroke(stroke) {
        if (stroke.points.length === 0) {
            return;
        }
        ctx.beginPath();
        // change to brush or eraser depending on recorded brush settings of stroke
        if (stroke.type === "eraser") {
            ctx.globalCompositeOperation = "destination-out";
        }
        else {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = stroke.color;
        }
        ctx.lineWidth = stroke.size;
        ctx.moveTo(stroke.points[0].x,stroke.points[0].y);
        // draw on canvas all recorded points in a stroke
        for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x,stroke.points[i].y);
        }
        ctx.stroke();

    }

    // used for every undo and redo to redraw the points from the strokes stack
    function redraw() {
       // save brush original settings to be used llater
        const orig_color = ctx.strokeStyle
        const orig_size = ctx.lineWidth
        const original_operation = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "source-over"
        ctx.clearRect(0,0,canvas.width,canvas.height);
        // reload saved image from database if any for every redraw
        if (image){
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        }
        for (const stroke of strokes_stack) {
            drawStroke(stroke);
        }
        // reuse old brush settings
        ctx.strokeStyle = orig_color
        ctx.lineWidth = orig_size
        ctx.globalCompositeOperation = original_operation;
        document.querySelector('#brush-size').value = orig_size
        console.log(`changed official: ${ctx.lineWidth} to orig_size${orig_size} and ofificial: ${ctx.strokeStyle} to color${orig_color}`)

    }

    function undo(event) {
        if (strokes_stack.length === 0) {
            return;
        }
        // retrieve removed stroke from strokes and place on redo stack
        const stroke = strokes_stack.pop();
        redo_stack.push(stroke);
        // redraw canvas from the strokes
        redraw();
        // here to prevent ctrl+z default browser activity 
        event.preventDefault()
    }


    function redo(event) {
        if (redo_stack.length === 0) {
            return;
        }
        const stroke = redo_stack.pop();
        strokes_stack.push(stroke);
        // redraw canvas from the strokes
        redraw();
        // here to prevent ctrl+y default browser activity 
        event.preventDefault()
    }
});

