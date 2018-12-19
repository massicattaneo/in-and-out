(function () {
    var c = document.getElementById('snow'),
        $ = c.getContext("2d");
    var w = c.width = window.innerWidth,
        h = c.height = window.innerHeight;
    var arr = [];

    function initFlakes() {
        arr.length = 0;
        var snow;
        var num = 600, sp = 1;
        var sc = 0.6, t = 0, min = 1;
        for (var i = 0; i < num; ++i) {
            snow = new Flake();
            snow.y = Math.random() * (h + 50);
            snow.x = Math.random() * w;
            snow.t = Math.random() * (Math.PI * 2);
            snow.sz = (100 / (10 + (Math.random() * 100))) * sc;
            snow.sp = (Math.pow(snow.sz * .8, 2) * .15) * sp;
            snow.sp = snow.sp < min ? min : snow.sp;
            arr.push(snow);
        }
    }

    function Flake() {
        this.draw = function() {
            this.g = $.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.sz);
            this.g.addColorStop(0, 'hsla(255,255%,255%,1)');
            this.g.addColorStop(1, 'hsla(255,255%,255%,0)');
            $.moveTo(this.x, this.y);
            $.fillStyle = this.g;
            $.beginPath();
            $.arc(this.x, this.y, this.sz, 0, Math.PI * 2, true);
            $.fill();}
    }

    function Snowy() {
        var tsc = 1;
        var mv = 20;
        initFlakes(arr);
        go();
        function go(){
            window.requestAnimationFrame(go);
            $.clearRect(0, 0, w, h);
            // $.fillStyle = 'hsla(242, 95%, 3%, 0)';
            // $.fillRect(0, 0, w, h);
            $.fill();
            for (var i = 0; i < arr.length; ++i) {
                f = arr[i];
                f.t += .05;
                f.t = f.t >= Math.PI * 2 ? 0 : f.t;
                f.y += f.sp;
                f.x += Math.sin(f.t * tsc) * (f.sz * .3);
                if (f.y > h + 50) f.y = -10 - Math.random() * mv;
                if (f.x > w + mv) f.x = - mv;
                if (f.x < - mv) f.x = w + mv;
                f.draw();}
        }

    }
    Snowy();

    /*________________________________________*/
    window.addEventListener('resize', function() {
        c.height = 0;
        c.width = 0;
        var width = window.innerWidth;
        var height = window.innerHeight;
        c.height = h = height;
        c.width = w = width;
        initFlakes();
    }, false);
})();
