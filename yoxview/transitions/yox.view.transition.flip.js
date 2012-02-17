yox.view.transitions.flip = function(){
    var $frame,
        panels,
        currentPanelIndex = 1,
        defaultTransitionTime,
        currentTransitionTime,
        currentDeg = -180,
        self = this;

    this.create = function($container, onLoad){
        var view = this;
        this.$container = $container;
        $container.css("perspective", "800px");
        $frame = $("<div>", { "class": "yoxviewFrame yoxviewFrame_" + this.options.resizeMode + " yoxviewFrame_" + $.yoxview.platform + " yoxviewFrame_flip"}).appendTo($container);
        if (this.options.transitionTime){
            currentTransitionTime = defaultTransitionTime = this.options.transitionTime;
            $frame.css({
                transition: "all " + defaultTransitionTime + "ms ease-out",
                transformStyle: "preserve-3d",
                width: "100%",
                height: "100%",
                border: "none"
            });
        }

        panels = [];
        for(var i=0; i<2; i++){
            var $img = $("<img>", { src: "", "class": "yoxviewImg" });
            if (i === 1)
                $img.css("transform", "rotateY(180deg)");

            $img.css({
                backfaceVisibility: "hidden",
                background: "Black",
                position: "absolute",
                top: "50%", left: "50%",
                width: 0, height: 0,
                border: "solid 1px #666"
            });

            $img.attr("data-index", i);
            $img.on("load", { view: view }, onLoad);
            panels.push($img.appendTo($frame));
        }
    };

    this.destroy = function(){
        this.$container.css("perspective", "");
        $frame.remove();
    };

    this.getCurrentPanel = function(){
        return panels[currentPanelIndex];
    };

    this.getPanel = function(item){
        currentPanelIndex = currentPanelIndex ? 0 : 1;
        return panels[currentPanelIndex];
    };

    this.transition = function(position, time, isUpdate){
        if (time !== undefined){
            if (isNaN(time))
                throw new TypeError("Invalid value for transition time, must be a number (in milliseconds).");
        }
        else
            time = defaultTransitionTime;

        if (time !== currentTransitionTime){
            //panelCss.transition = "opacity " + time + "ms ease-out";
            position.transition = "all " + time + "ms ease-out";
            currentTransitionTime = time;
        }

        self.getCurrentPanel().css(position);

        if (!isUpdate){
            currentDeg -= 180;
            //panels[1].css("opacity", currentPanelIndex);
            $frame.css("transform", "rotateY(" + currentDeg + "deg)");
        }

    };

    this.update = function(updateData){
        if (updateData.transitionTime !== undefined)
            $frame.css("transitionDuration", updateData.transitionTime + "ms");
    };
};

yox.view.transitions.flip.prototype = new yox.view.transition();